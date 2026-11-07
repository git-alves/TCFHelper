import { NextResponse } from "next/server";
import { TaskType, TopicSource } from "@prisma/client";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { AppUserProvisioningError } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { classifyWritingContext } from "@/lib/guided-writing-classifier";

const TASK_TYPES = Object.values(TaskType);
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

/**
 * One random topic for the selected task, drawn only from the app's own
 * database of practice topics (the managed OFFICIAL_EXAM starter bank, see
 * src/lib/starter-topics.ts). It never calls an outside site or an AI model,
 * so it costs nothing per click and works whenever the database does.
 */
export async function GET(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentActivatedAppUser>>;
  try {
    user = await getCurrentActivatedAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return NextResponse.json(
        {
          error: "Your account is still being set up. Please try again.",
          code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
        },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const requestedTaskType = new URL(request.url).searchParams.get("taskType");
  if (!requestedTaskType || !TASK_TYPES.includes(requestedTaskType as TaskType)) {
    return NextResponse.json({ error: "Invalid taskType." }, { status: 400, headers: NO_STORE_HEADERS });
  }
  const taskType = requestedTaskType as TaskType;
  const excludeTopicId = new URL(request.url).searchParams.get("excludeTopicId");

  const topics = await prisma.topic.findMany({
    // A retired starter topic stays gradeable for whoever already has its id
    // (see seed-topic-sync.ts) but must not be offered again, and a learner's
    // own pasted topic must never appear in the shared bank.
    where: { taskType, source: TopicSource.OFFICIAL_EXAM, retiredAt: null },
    select: { id: true, taskType: true, title: true, prompt: true, guideContext: true },
  });

  if (topics.length === 0) {
    return NextResponse.json(
      { error: "No topics are available for this task yet.", code: "NO_TOPICS_AVAILABLE" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  // A learner asking for another random topic expects to move on, not to be
  // handed the card they are already reading. Keep the sole available topic
  // selectable, though: exclusion must never turn a usable one-topic bank
  // into an error state.
  const selectableTopics =
    excludeTopicId && topics.length > 1 ? topics.filter((topic) => topic.id !== excludeTopicId) : topics;
  const topic = selectableTopics[Math.floor(Math.random() * selectableTopics.length)];

  // An editorial profile on the stored topic wins over the deterministic
  // classifier -- see docs/guided-writing.md's context-source table.
  const guideContext = topic.guideContext
    ? { profile: topic.guideContext, confidence: "deterministic" as const }
    : classifyWritingContext(topic.taskType, topic.prompt);

  return NextResponse.json(
    {
      topic: {
        id: topic.id,
        taskType: topic.taskType,
        title: topic.title,
        prompt: topic.prompt,
        guideContext,
      },
    },
    { headers: NO_STORE_HEADERS },
  );
}
