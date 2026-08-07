import { NextResponse } from "next/server";
import { z } from "zod";
import { EssayStatus, TaskType, TopicSource } from "@prisma/client";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { gradeEssayWithGemini } from "@/lib/gemini";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import { essayFeedbackSchema, type EssayFeedback } from "@/lib/essay-feedback";
import { buildCorrectionSystemPrompt, buildCorrectionUserPrompt } from "@/lib/essay-correction-prompt";
import { APP_LOCALES, APP_LOCALE_LANGUAGE_NAMES, DEFAULT_APP_LOCALE } from "@/lib/app-locale";
import {
  claimCorrection,
  completeCorrectionClaim,
  releaseCorrectionClaim,
  type CorrectionTopicContext,
} from "@/lib/correction-claim";
import { getCorrectionRequestKey } from "@/lib/correction-request-key";

const TASK_TYPES = Object.values(TaskType) as [TaskType, ...TaskType[]];
const SHARED_TOPIC_SOURCES = new Set<TopicSource>([
  TopicSource.OFFICIAL_EXAM,
  TopicSource.RECENT_EXAM,
]);
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

const requestSchema = z.object({
  taskType: z.enum(TASK_TYPES),
  topicId: z.string().min(1).optional(),
  topicPrompt: z.string().trim().min(1).max(2000).optional(),
  // Preserve the exact submitted characters after validation. The modal,
  // persisted essay, and model-provided UTF-16 error offsets must all refer
  // to the same text; trimming here would shift pasted leading whitespace.
  content: z.string().min(1).max(20000).refine((value) => value.trim().length > 0),
  locale: z.enum(APP_LOCALES).default(DEFAULT_APP_LOCALE),
}).superRefine((data, ctx) => {
  if (!data.topicId && !data.topicPrompt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["topicPrompt"],
      message: "Provide a topic prompt or a topic ID.",
    });
  }
});

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function duplicateCorrectionResponse(essayId?: string) {
  const body = {
    error: "This response has already been corrected. Edit it before requesting another correction.",
    code: "CORRECTION_ALREADY_EXISTS",
  };

  return NextResponse.json(
    essayId ? { ...body, essayId } : body,
    { status: 409, headers: NO_STORE_HEADERS },
  );
}

function isUniqueCorrectionConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function correctionInProgressResponse(retryAt: Date) {
  const retryAfterSeconds = Math.max(1, Math.ceil((retryAt.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    {
      error: "A correction for this response is already in progress. Please try again shortly.",
      code: "CORRECTION_IN_PROGRESS",
      retryAt: retryAt.toISOString(),
    },
    { status: 409, headers: { ...NO_STORE_HEADERS, "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentAppUser>>;
  try {
    user = await getCurrentAppUser();
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

  const { taskType, topicId, topicPrompt: submittedTopicPrompt, content, locale } = parsed.data;
  const task = TASK_INSTRUCTIONS[taskType];
  const wordCount = countWords(content);
  const feedbackLanguage = APP_LOCALE_LANGUAGE_NAMES[locale];

  let resolvedTopicId: string | null = null;
  let resolvedTopicPrompt: string;
  let correctionTopic: CorrectionTopicContext;
  let requestKeyTopic: { kind: "recent"; id: string } | { kind: "custom"; prompt: string };
  if (topicId) {
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    // `topicId` represents a server-authoritative shared source (the legacy
    // official bank or an imported recent-exam topic). Learner-supplied prompts
    // must enter through `topicPrompt`, never be addressable by a shared ID
    // that could link another learner's private prompt.
    if (!topic || topic.taskType !== taskType || !SHARED_TOPIC_SOURCES.has(topic.source)) {
      return NextResponse.json({ error: "Unknown topic." }, { status: 400 });
    }
    resolvedTopicId = topic.id;
    // A server-issued topic ID is the source of truth. Never let the client
    // pair an existing topic record with a different grading prompt.
    resolvedTopicPrompt = topic.prompt;
    correctionTopic = { kind: "shared", id: topic.id };
    requestKeyTopic = { kind: "recent", id: topic.id };
  } else {
    // The schema refinement above guarantees a prompt for this branch.
    const topicPrompt = submittedTopicPrompt!;
    // Defer creating this private-prompt Topic until the provider result is
    // persisted. A duplicate/in-progress request must not leave an orphan
    // Topic row behind merely because it was rejected before grading.
    resolvedTopicPrompt = topicPrompt;
    correctionTopic = { kind: "custom", prompt: topicPrompt };
    requestKeyTopic = { kind: "custom", prompt: topicPrompt };
  }

  const correctionKey = getCorrectionRequestKey({
    taskType,
    topic: requestKeyTopic,
    content,
  });
  // Request validation and the topic branches above make this unreachable,
  // but fail closed rather than send a provider request without a durable key.
  if (!correctionKey) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const claimInput = {
    userId: user.id,
    correctionKey,
    taskType,
    content,
    topic: correctionTopic,
  };

  let claim;
  try {
    claim = await claimCorrection(claimInput);
  } catch (error) {
    // Failing closed avoids sending an unprotected provider request when the
    // durable claim store cannot be reached.
    console.error("Correction claim failed", error);
    return NextResponse.json(
      { error: "The correction service is temporarily unavailable. Please try again." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  if (claim.kind === "existing") return duplicateCorrectionResponse(claim.essayId);
  if (claim.kind === "inProgress") return correctionInProgressResponse(claim.retryAt);

  const systemPrompt = buildCorrectionSystemPrompt(feedbackLanguage);
  const userPrompt = buildCorrectionUserPrompt({ task, resolvedTopicPrompt, content, wordCount });
  let shouldReleaseClaim = true;
  try {
    const rawFeedback = await gradeEssayWithGemini({ systemPrompt, userPrompt });
    const parsedFeedback = essayFeedbackSchema.safeParse(rawFeedback);
    if (!parsedFeedback.success) {
      return NextResponse.json(
        { error: "Could not parse feedback. Please try again." },
        { status: 502 },
      );
    }
    const feedback: EssayFeedback = parsedFeedback.data;

    const completion = await completeCorrectionClaim({
      ...claimInput,
      correctionKeyHash: claim.correctionKeyHash,
      claimToken: claim.claimToken,
      persist: async (tx) => {
        const topicIdForEssay =
          resolvedTopicId ??
          (
            await tx.topic.create({
              data: {
                taskType,
                title: resolvedTopicPrompt.slice(0, 80),
                prompt: resolvedTopicPrompt,
                source: TopicSource.USER_SUBMITTED,
              },
            })
          ).id;

        return tx.essay.create({
          data: {
            userId: user.id,
            topicId: topicIdForEssay,
            taskType,
            content,
            correctionKeyHash: claim.correctionKeyHash,
            wordCount,
            status: EssayStatus.SUBMITTED,
            feedback: {
              create: {
                level: feedback.cefrLevel,
                feedbackLocale: locale,
                summary: feedback.summary,
                meetsWordCount: feedback.meetsWordCount,
                grammarNotes: {
                  correctedText: feedback.correctedText,
                  modelVersion: feedback.modelVersion,
                  cefrRationale: feedback.cefrRationale,
                  wordCountNote: feedback.wordCountNote,
                  errors: feedback.errors,
                  scores: feedback.scores,
                },
                suggestions: feedback.suggestions,
              },
            },
          },
        });
      },
    },
    );

    if (completion.kind === "completed") {
      shouldReleaseClaim = false;
      return NextResponse.json(
        { essayId: completion.value.id, feedback },
        { headers: NO_STORE_HEADERS },
      );
    }
    if (completion.kind === "existing") return duplicateCorrectionResponse(completion.essayId);
    if (completion.kind === "inProgress") return correctionInProgressResponse(completion.retryAt);

    // The lease disappeared before this request could persist. Do not return
    // its unpersisted result; a retry will either see the winner or reclaim
    // the expired key safely.
    return NextResponse.json(
      { error: "The correction service is temporarily unavailable. Please try again." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    // The unique Essay key is a final backstop behind the claim lease. In the
    // unlikely event a rolling deployment or external writer reaches it,
    // preserve the product rule instead of presenting a misleading grading
    // failure. A later history read will expose the already-saved review.
    if (isUniqueCorrectionConstraintError(error)) {
      return duplicateCorrectionResponse();
    }
    console.error("Essay correction failed", error);
    return NextResponse.json(
      { error: "Something went wrong while grading your essay." },
      { status: 502, headers: NO_STORE_HEADERS },
    );
  } finally {
    if (shouldReleaseClaim) {
      await releaseCorrectionClaim({
        userId: user.id,
        correctionKeyHash: claim.correctionKeyHash,
        claimToken: claim.claimToken,
      }).catch(() => {
        console.error("Correction claim cleanup failed");
      });
    }
  }
}
