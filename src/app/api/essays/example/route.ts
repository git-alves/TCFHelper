import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskType, TopicSource } from "@prisma/client";
import { AppUserProvisioningError } from "@/lib/app-user";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { prisma } from "@/lib/prisma";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import type { ExampleCefrLevel } from "@/lib/gemini";
import { GeminiRequestError, GeminiTransportError } from "@/lib/gemini";
import {
  cacheExample,
  claimExampleGeneration,
  findCachedExample,
  hashExampleTopic,
  refundExampleGenerationLease,
  releaseExampleGenerationLease,
} from "@/lib/example-answer-cache";
import {
  hasConfiguredModelAnswerProvider,
  ModelAnswerInvalidOutputError,
  ModelAnswerNotConfiguredError,
  ModelAnswerRateLimitedError,
  generatePreferredModelAnswer,
} from "@/lib/model-answer-generator";
import { recordAdminEvent, type AdminEventReasonCode } from "@/lib/admin-events";

const TASK_TYPES = Object.values(TaskType) as [TaskType, ...TaskType[]];
const EXAMPLE_LEVELS = ["B2", "C1", "C2"] as const;
const SHARED_TOPIC_SOURCES = new Set<TopicSource>([
  TopicSource.OFFICIAL_EXAM,
  TopicSource.RECENT_EXAM,
]);
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

const requestSchema = z
  .object({
    taskType: z.enum(TASK_TYPES),
    level: z.enum(EXAMPLE_LEVELS),
    topicId: z.string().min(1).optional(),
    topicPrompt: z.string().trim().min(1).max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.topicId && !data.topicPrompt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["topicPrompt"],
        message: "Provide a topic prompt or a topic ID.",
      });
    }
  });

// Maps a generation failure to the shared closed event vocabulary. Never
// record an upstream provider message: it is not trusted and could echo
// request content.
function classifyExampleGenerationFailure(error: unknown): AdminEventReasonCode {
  if (error instanceof ModelAnswerInvalidOutputError) return "invalid_response";
  if (error instanceof GeminiRequestError) return "upstream_http_error";
  if (error instanceof GeminiTransportError) return "transport_error";
  return "provider_unavailable";
}

function boundedGeminiHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof GeminiRequestError)) return undefined;
  return Number.isInteger(error.status) && error.status >= 100 && error.status <= 599
    ? error.status
    : undefined;
}

export async function POST(request: Request) {
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
        { status: 503 },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { taskType, level, topicId, topicPrompt: submittedTopicPrompt } = parsed.data;
  const task = TASK_INSTRUCTIONS[taskType];

  let resolvedTopicPrompt: string;
  if (topicId) {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.taskType !== taskType || !SHARED_TOPIC_SOURCES.has(topic.source)) {
      return NextResponse.json({ error: "Unknown topic." }, { status: 400, headers: NO_STORE_HEADERS });
    }
    resolvedTopicPrompt = topic.prompt;
  } else {
    // The schema refinement above guarantees a prompt for this branch. This
    // example is never persisted, so — unlike /api/essays/correct — a
    // learner-supplied prompt needs no Topic row for provenance.
    resolvedTopicPrompt = submittedTopicPrompt!;
  }

  const typedLevel = level as ExampleCefrLevel;
  const topicHash = hashExampleTopic(taskType, resolvedTopicPrompt);
  let cached: { content: string } | null;
  try {
    cached = await findCachedExample(user.id, taskType, typedLevel, topicHash);
  } catch {
    console.error("Example answer cache read failed");
    return NextResponse.json(
      { error: "The example generator is temporarily unavailable.", code: "EXAMPLE_CACHE_UNAVAILABLE" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }
  if (cached) {
    return NextResponse.json({ text: cached.content, cached: true }, { headers: NO_STORE_HEADERS });
  }

  // Do this after a cache read so saved study material is still available
  // during a configuration outage, but before a fresh daily slot is spent.
  if (!hasConfiguredModelAnswerProvider()) {
    await recordAdminEvent({
      eventType: "EXAMPLE_PROVIDER_FAILED",
      userId: user.id,
      provider: "gemini",
      reasonCode: "not_configured",
      httpStatus: 503,
    });
    return NextResponse.json(
      { error: "The example generator is not configured.", code: "EXAMPLE_GENERATOR_UNAVAILABLE" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  let claim;
  try {
    claim = await claimExampleGeneration(user.id, taskType, typedLevel, topicHash);
  } catch {
    console.error("Example generation cache claim failed");
    return NextResponse.json(
      { error: "The example generator is temporarily unavailable.", code: "EXAMPLE_CACHE_UNAVAILABLE" },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (claim.kind === "cached") {
    return NextResponse.json({ text: claim.content, cached: true }, { headers: NO_STORE_HEADERS });
  }

  if (claim.kind === "inProgress") {
    return NextResponse.json(
      {
        error: "An example for this topic is already being generated. Please try again shortly.",
        code: "EXAMPLE_GENERATION_IN_PROGRESS",
        retryAt: claim.retryAt.toISOString(),
      },
      { status: 409, headers: { ...NO_STORE_HEADERS, "Retry-After": "5" } },
    );
  }

  if (claim.kind === "cooldown") {
    await recordAdminEvent({
      eventType: "EXAMPLE_QUOTA_DENIED",
      userId: user.id,
      reasonCode: "cooldown",
      httpStatus: 429,
    });
    return NextResponse.json(
      {
        error: "The example generator is busy. Please try again shortly.",
        code: "EXAMPLE_RATE_LIMITED",
        retryAt: claim.retryAt.toISOString(),
      },
      {
        status: 429,
        headers: {
          ...NO_STORE_HEADERS,
          "Retry-After": String(Math.max(1, Math.ceil((claim.retryAt.getTime() - Date.now()) / 1000))),
        },
      },
    );
  }

  if (claim.kind === "dailyLimit") {
    await recordAdminEvent({
      eventType: "EXAMPLE_QUOTA_DENIED",
      userId: user.id,
      reasonCode: "daily_limit",
      httpStatus: 429,
      quotaWindow: "day",
      usageValue: claim.usageValue,
      quotaLimit: claim.quotaLimit,
    });
    return NextResponse.json(
      {
        error: "The daily example limit has been reached. Please try again tomorrow.",
        code: "EXAMPLE_DAILY_LIMIT_REACHED",
        resetAt: claim.resetAt.toISOString(),
      },
      { status: 429, headers: NO_STORE_HEADERS },
    );
  }

  try {
    const generated = await generatePreferredModelAnswer({
      task,
      taskType,
      level: typedLevel,
      topicPrompt: resolvedTopicPrompt,
    });
    // The fixed provider name remains in the cache metadata and logs so each
    // saved example has a clear provenance record.
    console.log("Example generated:", generated.provider);
    try {
      const saved = await cacheExample(
        user.id,
        taskType,
        typedLevel,
        topicHash,
        generated.text,
        generated.provider,
        claim.claimToken,
      );
      // A prior lease may have timed out and been replaced while its provider
      // call was finishing. Its answer remains useful to that initiating
      // learner, but it must not overwrite the newer lease's cached answer.
      return NextResponse.json(
        { text: saved?.content ?? generated.text, cached: false },
        { headers: NO_STORE_HEADERS },
      );
    } catch {
      // The learner asked for the answer, not a cache write. Return a
      // successful provider result rather than spending a second free call.
      console.error("Example answer cache write failed");
      await releaseExampleGenerationLease(user.id, taskType, typedLevel, topicHash, claim.claimToken).catch(() => {
        console.error("Example generation lease cleanup failed");
      });
      return NextResponse.json({ text: generated.text, cached: false }, { headers: NO_STORE_HEADERS });
    }
  } catch (error) {
    // The provider call itself failed, so the learner received nothing for
    // the slot they reserved — refund it, unlike the cache-write-failure
    // branch above, which already delivered a real answer.
    await refundExampleGenerationLease(user.id, taskType, typedLevel, topicHash, claim.claimToken).catch(() => {
      console.error("Example generation lease cleanup failed");
    });
    if (error instanceof ModelAnswerNotConfiguredError) {
      await recordAdminEvent({
        eventType: "EXAMPLE_PROVIDER_FAILED",
        userId: user.id,
        provider: "gemini",
        reasonCode: "not_configured",
        httpStatus: 503,
      });
      return NextResponse.json(
        { error: "The example generator is not configured.", code: "EXAMPLE_GENERATOR_UNAVAILABLE" },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }

    if (error instanceof ModelAnswerRateLimitedError) {
      await recordAdminEvent({
        eventType: "EXAMPLE_PROVIDER_FAILED",
        userId: user.id,
        provider: "gemini",
        reasonCode: "rate_limited",
        httpStatus: 429,
      });
      return NextResponse.json(
        { error: "The example generator is busy. Please try again shortly.", code: "EXAMPLE_RATE_LIMITED" },
        { status: 429, headers: NO_STORE_HEADERS },
      );
    }

    // Log a fixed, closed classification rather than the upstream error's
    // own message: an arbitrary provider error string is not a trusted
    // value and must never be assumed safe to persist in logs. The HTTP
    // status alone (a small closed set of numbers) is safe to include and
    // is what actually distinguishes an auth/config problem from a
    // transient upstream outage in the Vercel function log.
    const reasonCode = classifyExampleGenerationFailure(error);
    await recordAdminEvent({
      eventType: "EXAMPLE_PROVIDER_FAILED",
      userId: user.id,
      provider: "gemini",
      reasonCode,
      httpStatus: boundedGeminiHttpStatus(error) ?? 502,
    });
    console.error("Example generation failed:", reasonCode);
    return NextResponse.json(
      { error: "Something went wrong while generating the example." },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  }
}
