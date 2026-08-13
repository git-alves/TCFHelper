import "server-only";

import { EssayStatus, type CefrLevel, type Prisma, type TaskType } from "@prisma/client";
import { z } from "zod";
import { getAppCopy } from "@/lib/app-copy";
import { isAppLocale, type AppLocale } from "@/lib/app-locale";
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
  // "legacy": migrated from the pre-"hybrid grid" shape (see
  // migrateLegacyStoredFields) -- feedback.cefr.estimatedLevel and
  // .conservativeLevel are the same recorded value, not two independently
  // assessed ones, so the UI must not present them as Secure/Demonstrated
  // levels. "current": a genuine two-value assessment.
  cefrAssessment: "current" | "legacy";
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
 *
 * The returned feedbackLocale is always the row's own recorded value,
 * unchanged (possibly null) -- never guessed. A migrated row's real
 * historic content (rationale, corrected text, error explanations, summary,
 * suggestions) could have been generated in any locale the learner had
 * selected at the time; defaulting a missing feedbackLocale to English would
 * make the modal falsely claim the *entire* correction was generated in
 * English for a viewer in another language, when the truth is simply
 * unknown. Only the text this migration itself injects (see
 * migrateLegacyStoredFields) needs a language at all, and that is generated
 * fresh in viewerLocale -- the language the viewer is reading right now --
 * so it never needs a mismatch warning of its own.
 */
export function parseStoredEssayFeedback({
  level,
  summary,
  grammarNotes,
  suggestions,
  meetsWordCount,
  feedbackLocale,
  viewerLocale,
}: {
  level: CefrLevel | null;
  summary: string;
  grammarNotes: unknown;
  suggestions: unknown;
  meetsWordCount: boolean;
  feedbackLocale: string | null;
  viewerLocale: AppLocale;
}): { feedback: EssayFeedback; feedbackLocale: AppLocale | null; cefrAssessment: "current" | "legacy" } | null {
  const storedSuggestions = storedSuggestionsSchema.safeParse(suggestions);
  if (!storedSuggestions.success || !level) return null;

  const storedFields = storedCorrectionFieldsSchema.safeParse(grammarNotes);
  const migratedFields = storedFields.success
    ? null
    : migrateLegacyStoredFields(grammarNotes, level, viewerLocale);
  const fields = storedFields.success ? storedFields.data : migratedFields;
  if (!fields) return null;

  const parsed = essayFeedbackSchema.safeParse({
    ...fields,
    summary,
    suggestions: storedSuggestions.data,
    meetsWordCount,
  });
  if (!parsed.success) return null;

  // "Unknown" confidence is reserved for a migrated legacy record (see
  // migrateLegacyStoredFields) -- the live route's freshEssayFeedbackSchema
  // rejects it outright, so a *current*-shaped row should never actually
  // carry it. But shape alone isn't sufficient to trust "current": if one
  // somehow does (a manual edit, a future regression, a pre-fresh-validator
  // row that happens to already use the current field names), presenting it
  // with the Secure/Demonstrated framing would still overclaim a consistency
  // check that "Unknown" itself says was never performed. Confidence is
  // checked independently of shape for this reason.
  const cefrAssessment: "current" | "legacy" =
    storedFields.success && parsed.data.cefr.confidence !== "Unknown" ? "current" : "legacy";

  return {
    feedback: parsed.data,
    feedbackLocale: isAppLocale(feedbackLocale) ? feedbackLocale : null,
    cefrAssessment,
  };
}

function migrateLegacyStoredFields(
  grammarNotes: unknown,
  level: CefrLevel,
  viewerLocale: AppLocale,
): z.infer<typeof storedCorrectionFieldsSchema> | null {
  const legacy = legacyStoredCorrectionFieldsSchema.safeParse(grammarNotes);
  if (!legacy.success) return null;

  const legacyCopy = getAppCopy(viewerLocale).workspace.correctionModal;

  return {
    correctedText: legacy.data.correctedText,
    modelVersion: legacy.data.modelVersion,
    scores: legacy.data.scores,
    // estimatedLevel/conservativeLevel/confidence/evidence/blocker didn't
    // exist yet -- the old schema recorded a single CEFR level with no
    // Demonstrated/Secure distinction, so it is honestly not known whether
    // that level was ever verified as "consistently controlled" the way
    // conservativeLevel requires today. Both fields reuse the one recorded
    // value (the closest available approximation), but legacyCefrLevelNote
    // says so explicitly rather than letting the Secure-level badge imply a
    // consistency check that was never actually performed. confidence,
    // evidence, and blocker were genuinely never assessed at all, so those
    // say so too rather than fabricating a value or duplicating the one real
    // field (the old blended rationale) under two more headings as if it had
    // been independently derived for each.
    cefr: {
      estimatedLevel: level,
      conservativeLevel: level,
      confidence: "Unknown",
      rationale: `${legacyCopy.legacyCefrLevelNote} ${legacy.data.cefrRationale}`,
      evidence: legacyCopy.legacyCefrDetailUnavailable,
      blocker: legacyCopy.legacyCefrDetailUnavailable,
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
export async function getCorrectionForUser(
  userId: string,
  essayId: string,
  viewerLocale: AppLocale,
): Promise<CorrectionHistoryDetail | null> {
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
  const parsed = parseStoredEssayFeedback({ ...essay.feedback, viewerLocale });

  if (parsed) {
    return {
      ...base,
      kind: "complete",
      feedback: parsed.feedback,
      feedbackLocale: parsed.feedbackLocale,
      cefrAssessment: parsed.cefrAssessment,
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
