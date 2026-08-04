import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskType, TopicSource } from "@prisma/client";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { generateTopic } from "@/lib/topic-generator";
import { generateTopicImage } from "@/lib/topic-image";

const TASK_TYPES = Object.values(TaskType) as [TaskType, ...TaskType[]];
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
const IMAGE_GENERATION_TIMEOUT_MS = 30_000;

const requestSchema = z.object({ taskType: z.enum(TASK_TYPES) });

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

const TOPIC_SELECT = {
  id: true,
  taskType: true,
  title: true,
  prompt: true,
  imageData: true,
  imageAlt: true,
} as const;

async function findReusableTopic(taskType: TaskType, userId: string) {
  // A learner can click "generate new topic" many times without ever
  // submitting an essay, so reuse is scoped to topics this learner has not
  // yet used rather than topics nobody has ever used. Repeat clicks pull
  // from this shared, growing bank instead of paying for a fresh Claude and
  // image-API call every time.
  const candidates = await prisma.topic.findMany({
    where: {
      taskType,
      source: TopicSource.AI_GENERATED,
      essays: { none: { userId } },
    },
    select: TOPIC_SELECT,
  });

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function generateImageDataBestEffort(
  imagePrompt: string,
  requestSignal: AbortSignal,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const controller = new AbortController();
  const abortForClient = () => controller.abort(requestSignal.reason);
  if (requestSignal.aborted) {
    abortForClient();
  } else {
    requestSignal.addEventListener("abort", abortForClient, { once: true });
  }
  const timeout = setTimeout(
    () => controller.abort(new DOMException("Image generation timed out.", "TimeoutError")),
    IMAGE_GENERATION_TIMEOUT_MS,
  );

  try {
    const image = await generateTopicImage(imagePrompt, apiKey, controller.signal);
    return image.dataUrl;
  } catch (error) {
    // A missing illustration must never block topic generation: the topic
    // text itself is already a complete, usable practice prompt.
    console.error("Topic image generation failed", error);
    return null;
  } finally {
    clearTimeout(timeout);
    requestSignal.removeEventListener("abort", abortForClient);
  }
}

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentAppUser>>;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return jsonResponse(
        {
          error: "Your account is still being set up. Please try again.",
          code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
        },
        503,
      );
    }
    throw error;
  }

  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid taskType." }, 400);
  }

  const { taskType } = parsed.data;

  const reused = await findReusableTopic(taskType, user.id);
  if (reused) {
    return jsonResponse({ topic: reused, reused: true });
  }

  let generated;
  try {
    generated = await generateTopic(taskType);
  } catch (error) {
    console.error("Topic generation failed", error);
    return jsonResponse(
      { error: "We couldn't generate a new topic. Please try again or write your own." },
      502,
    );
  }

  const imageData =
    taskType === TaskType.TASK_3 && generated.imagePrompt
      ? await generateImageDataBestEffort(generated.imagePrompt, request.signal)
      : null;

  const topic = await prisma.topic.upsert({
    where: { externalRef: generated.externalRef },
    create: {
      taskType: generated.taskType,
      title: generated.title,
      prompt: generated.prompt,
      source: TopicSource.AI_GENERATED,
      externalRef: generated.externalRef,
      imageData,
      imageAlt: imageData ? generated.title : null,
    },
    update: {},
    select: TOPIC_SELECT,
  });

  return jsonResponse({ topic, reused: false });
}
