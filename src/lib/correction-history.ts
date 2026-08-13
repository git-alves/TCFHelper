import "server-only";

import { EssayStatus, type CefrLevel, type Prisma, type TaskType } from "@prisma/client";
import { z } from "zod";
import { getAppCopy } from "@/lib/app-copy";
import { DEFAULT_APP_LOCALE, isAppLocale, type AppLocale } from "@/lib/app-locale";
import { ERROR_CATEGORIES, essayFeedbackSchema, type EssayFeedback } from "@/lib/essay-feedback";
import { prisma } from "@/lib/prisma";

const storedCorrectionFieldsSchema = essayFeedbackSchema.pick({
  correctedText: true,
  modelVersion: true,
  scores: true,
  cefr: true,
  wordCountNote: true,
  errors: true,
});

// The shape grammarNotes was stored in before the "hybrid grid" prompt
// rewrite: a single blended cefrRationale string (no separate estimated
// level, confidence, evidence, or blocker) and original/correction/category
// -named error fields. Kept only so an essay corrected before that rewrite
// still renders its full corrected text, errors, and model version instead
// of degrading straight to a bare summary the moment the new schema can't
// parse its JSON as-is.
const legacyStoredCorrectionFieldsSchema = z.object({
  correctedText: essayFeedbackSchema.shape.correctedText,
  modelVersion: essayFeedbackSchema.shape.modelVersion,
  scores: essayFeedbackSchema.shape.scores,
  cefrRationale: z.string().min(1),
  wordCountNote: essayFeedbackSchema.shape.wordCountNote,
  errors: z.array(
    z.object({
      original: z.string(),
      originalStart: z.number().int().min(0).nullish(),
      correction: z.string(),
      correctionStart: z.number().int().min(0).nullish(),
      explanation: z.string(),
      category: z.enum(ERROR_CATEGORIES),
    }),
  ),
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
 * the server before they reach a history UI. A row stored under the current
 * shape parses directly; one stored under the pre-"hybrid grid" shape is
 * migrated onto the current shape (see legacyStoredCorrectionFieldsSchema)
 * so it keeps its full detail. Only a row whose JSON matches neither shape
 * -- genuinely incomplete or corrupted -- falls back to a limited-details
 * presentation.
 */
export function parseStoredEssayFeedback({
  level,
  summary,
  grammarNotes,
  suggestions,
  meetsWordCount,
  feedbackLocale,
}: {
  level: CefrLevel | null;
  summary: string;
  grammarNotes: unknown;
  suggestions: unknown;
  meetsWordCount: boolean;
  feedbackLocale: string | null;
}): EssayFeedback | null {
  const storedSuggestions = storedSuggestionsSchema.safeParse(suggestions);
  if (!storedSuggestions.success || !level) return null;

  const storedFields = storedCorrectionFieldsSchema.safeParse(grammarNotes);
  const migratedFields = storedFields.success
    ? null
    : migrateLegacyStoredFields(grammarNotes, level, isAppLocale(feedbackLocale) ? feedbackLocale : DEFAULT_APP_LOCALE);
  const fields = storedFields.success ? storedFields.data : migratedFields;
  if (!fields) return null;

  const parsed = essayFeedbackSchema.safeParse({
    ...fields,
    summary,
    suggestions: storedSuggestions.data,
    meetsWordCount,
  });

  return parsed.success ? parsed.data : null;
}

function migrateLegacyStoredFields(
  grammarNotes: unknown,
  level: CefrLevel,
  feedbackLocale: AppLocale,
): z.infer<typeof storedCorrectionFieldsSchema> | null {
  const legacy = legacyStoredCorrectionFieldsSchema.safeParse(grammarNotes);
  if (!legacy.success) return null;

  const legacyDetailUnavailable = getAppCopy(feedbackLocale).workspace.correctionModal.legacyCefrDetailUnavailable;

  return {
    correctedText: legacy.data.correctedText,
    modelVersion: legacy.data.modelVersion,
    scores: legacy.data.scores,
    // estimatedLevel/conservativeLevel/confidence/evidence/blocker didn't
    // exist yet -- the persisted level column stands in for both levels (it
    // was always the conservative one). confidence, evidence, and blocker
    // were genuinely never assessed, so this says so explicitly rather than
    // fabricating a specific confidence level or duplicating the one real
    // field (the old blended rationale) under two more headings as if it
    // had been independently derived for each.
    cefr: {
      estimatedLevel: level,
      conservativeLevel: level,
      confidence: "Unknown",
      rationale: legacy.data.cefrRationale,
      evidence: legacyDetailUnavailable,
      blocker: legacyDetailUnavailable,
    },
    wordCountNote: legacy.data.wordCountNote,
    errors: legacy.data.errors.map((error) => ({
      originalText: error.original,
      originalStart: error.originalStart,
      correctedText: error.correction,
      correctionStart: error.correctionStart,
      explanation: error.explanation,
      errorType: error.category,
    })),
  };
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

/**
 * Returns false for an unknown, draft, unreviewed, or another learner's
 * essay -- the same not-found conditions as getCorrectionForUser, so a
 * caller can respond identically rather than leaking which case applied.
 * Feedback rows cascade-delete with the Essay (see the schema's onDelete:
 * Cascade), so no separate cleanup is needed here.
 */
export async function deleteCorrectionForUser(userId: string, essayId: string): Promise<boolean> {
  const { count } = await prisma.essay.deleteMany({
    where: {
      ...submittedCorrectionWhere(userId),
      id: essayId,
    },
  });

  return count > 0;
}
