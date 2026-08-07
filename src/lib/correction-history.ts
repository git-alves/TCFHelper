import "server-only";

import { EssayStatus, type CefrLevel, type Prisma, type TaskType } from "@prisma/client";
import { z } from "zod";
import type { AppLocale } from "@/lib/app-locale";
import { essayFeedbackSchema, type EssayFeedback } from "@/lib/essay-feedback";
import { prisma } from "@/lib/prisma";

const storedCorrectionFieldsSchema = essayFeedbackSchema.pick({
  correctedText: true,
  modelVersion: true,
  scores: true,
  cefrRationale: true,
  wordCountNote: true,
  errors: true,
});

const storedSuggestionsSchema = z.array(z.string());

const historyItemSelect = {
  id: true,
  taskType: true,
  wordCount: true,
  createdAt: true,
  topic: { select: { title: true } },
  feedback: {
    select: {
      level: true,
      meetsWordCount: true,
      createdAt: true,
    },
  },
} satisfies Prisma.EssaySelect;

const historyDetailSelect = {
  id: true,
  taskType: true,
  content: true,
  wordCount: true,
  createdAt: true,
  topic: { select: { title: true } },
  feedback: {
    select: {
      level: true,
      feedbackLocale: true,
      summary: true,
      grammarNotes: true,
      suggestions: true,
      meetsWordCount: true,
      createdAt: true,
    },
  },
} satisfies Prisma.EssaySelect;

export interface CorrectionHistoryItem {
  id: string;
  taskType: TaskType;
  wordCount: number;
  createdAt: string;
  assessedAt: string;
  cefrLevel: CefrLevel | null;
  meetsWordCount: boolean;
  topicTitle: string | null;
}

interface CorrectionHistoryBase {
  id: string;
  taskType: TaskType;
  originalText: string;
  wordCount: number;
  createdAt: string;
  assessedAt: string;
  topicTitle: string | null;
}

export interface CompleteCorrectionHistoryDetail extends CorrectionHistoryBase {
  kind: "complete";
  feedback: EssayFeedback;
  feedbackLocale: AppLocale | null;
}

export interface LimitedCorrectionHistoryDetail extends CorrectionHistoryBase {
  kind: "limited";
  cefrLevel: CefrLevel | null;
  meetsWordCount: boolean;
  summary: string;
}

export type CorrectionHistoryDetail = CompleteCorrectionHistoryDetail | LimitedCorrectionHistoryDetail;

function submittedCorrectionWhere(userId: string): Prisma.EssayWhereInput {
  return {
    userId,
    status: EssayStatus.SUBMITTED,
    // A submitted row without a Feedback relation is not a completed
    // correction. The owner scope remains part of every history read.
    feedback: { is: {} },
  };
}

/**
 * The detailed correction fields live in legacy JSON columns. Parse them on
 * the server before they reach a history UI; old rows that predate the modal's
 * richer contract deliberately fall back to a limited-details presentation.
 */
export function parseStoredEssayFeedback({
  level,
  summary,
  grammarNotes,
  suggestions,
  meetsWordCount,
}: {
  level: CefrLevel | null;
  summary: string;
  grammarNotes: unknown;
  suggestions: unknown;
  meetsWordCount: boolean;
}): EssayFeedback | null {
  const storedFields = storedCorrectionFieldsSchema.safeParse(grammarNotes);
  const storedSuggestions = storedSuggestionsSchema.safeParse(suggestions);
  if (!storedFields.success || !storedSuggestions.success || !level) return null;

  const parsed = essayFeedbackSchema.safeParse({
    ...storedFields.data,
    cefrLevel: level,
    summary,
    suggestions: storedSuggestions.data,
    meetsWordCount,
  });

  return parsed.success ? parsed.data : null;
}

/**
 * A small, intentionally text-free dashboard list. The full original text and
 * model feedback are fetched only by the owner-scoped detail read below.
 */
async function getCorrections(userId: string, limit?: number): Promise<CorrectionHistoryItem[]> {
  const essays = await prisma.essay.findMany({
    where: submittedCorrectionWhere(userId),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    ...(limit === undefined ? {} : { take: limit }),
    select: historyItemSelect,
  });

  return essays.flatMap((essay) => {
    if (!essay.feedback) return [];

    return [
      {
        id: essay.id,
        taskType: essay.taskType,
        wordCount: essay.wordCount,
        createdAt: essay.createdAt.toISOString(),
        assessedAt: essay.feedback.createdAt.toISOString(),
        cefrLevel: essay.feedback.level,
        meetsWordCount: essay.feedback.meetsWordCount,
        topicTitle: essay.topic?.title ?? null,
      },
    ];
  });
}

export async function getRecentCorrections(userId: string, limit = 5): Promise<CorrectionHistoryItem[]> {
  return getCorrections(userId, limit);
}

/**
 * The first history slice intentionally renders all owner-visible records as
 * server HTML. A future cursor page can be added without changing the detail
 * ownership rule or exposing full essay text in the dashboard list.
 */
export async function getCorrectionHistory(userId: string): Promise<CorrectionHistoryItem[]> {
  return getCorrections(userId);
}

/**
 * Returns null for an unknown, draft, unreviewed, or another learner's essay.
 * Callers should render the same not-found response for all of these cases so
 * an authenticated learner cannot enumerate someone else's submission IDs.
 */
export async function getCorrectionForUser(userId: string, essayId: string): Promise<CorrectionHistoryDetail | null> {
  const essay = await prisma.essay.findFirst({
    where: {
      ...submittedCorrectionWhere(userId),
      id: essayId,
    },
    select: historyDetailSelect,
  });

  if (!essay?.feedback) return null;

  const base: CorrectionHistoryBase = {
    id: essay.id,
    taskType: essay.taskType,
    originalText: essay.content,
    wordCount: essay.wordCount,
    createdAt: essay.createdAt.toISOString(),
    assessedAt: essay.feedback.createdAt.toISOString(),
    topicTitle: essay.topic?.title ?? null,
  };
  const feedback = parseStoredEssayFeedback(essay.feedback);

  if (feedback) {
    return {
      ...base,
      kind: "complete",
      feedback,
      feedbackLocale: essay.feedback.feedbackLocale,
    };
  }

  return {
    ...base,
    kind: "limited",
    cefrLevel: essay.feedback.level,
    meetsWordCount: essay.feedback.meetsWordCount,
    summary: essay.feedback.summary,
  };
}
