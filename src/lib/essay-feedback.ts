import { z } from "zod";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const ERROR_CATEGORIES = [
  "grammar",
  "vocabulary",
  "spelling",
  "syntax",
  "punctuation",
  "register",
] as const;

export const CEFR_CONFIDENCE_LEVELS = ["High", "Medium", "Low"] as const;

// A wider domain than CEFR_CONFIDENCE_LEVELS: Gemini's response schema (see
// gemini.ts) only ever offers High/Medium/Low for a fresh correction, so a
// live grading result can never legitimately claim "Unknown". A correction
// stored before confidence was tracked at all genuinely has no assessed
// value, though -- "Unknown" represents that honestly instead of the
// migration that reads old rows fabricating one of the three real levels.
export const CEFR_CONFIDENCE_LEVELS_WITH_UNKNOWN = [...CEFR_CONFIDENCE_LEVELS, "Unknown"] as const;

// Index into CEFR_LEVELS, so ordering can be compared numerically rather
// than lexically (the strings are not alphabetically ordered by level).
function cefrLevelRank(level: (typeof CEFR_LEVELS)[number]): number {
  return CEFR_LEVELS.indexOf(level);
}

const criterionScoreSchema = z.object({
  score: z.number().int().min(0).max(100).describe("A whole-number 0-100 score for this criterion."),
  feedback: z
    .string()
    .describe(
      "A brief note on this criterion, written in the feedback language specified in the system prompt."
    ),
});

// Structured-output schema for grading a TCF written-expression essay.
// grammarNotes/suggestions on the Feedback model are untyped Json columns,
// so this shape is what actually defines the contract between the model
// response, the stored record, and the client.
export const essayFeedbackSchema = z.object({
  correctedText: z
    .string()
    .describe(
      "The essay rewritten in correct, natural French, preserving the author's ideas and structure while fixing every error."
    ),
  modelVersion: z
    .string()
    .describe(
      "An idealized rewrite of the essay in natural, fluent French, using more advanced vocabulary and phrasing than the corrected version. Keep the author's core intent, use the task-appropriate word range, and offer it as an inspirational model rather than just an error fix."
    ),
  scores: z.object({
    content: criterionScoreSchema.describe(
      "Content / pragmatics: how well the essay answers the prompt and achieves its communicative purpose."
    ),
    linguistics: criterionScoreSchema.describe(
      "Linguistics: grammar, spelling, and syntax accuracy."
    ),
    vocabulary: criterionScoreSchema.describe(
      "Vocabulary / register: lexical range and appropriateness of tone."
    ),
  }),
  cefr: z
    .object({
      estimatedLevel: z
        .enum(CEFR_LEVELS)
        .describe(
          "Demonstrated level: the CEFR level the raw evidence alone would suggest, including capability shown only occasionally, before applying the conservative tie-breaking rule."
        ),
      conservativeLevel: z
        .enum(CEFR_LEVELS)
        .describe(
          "Secure level: the CEFR level actually assigned to the student -- estimatedLevel, lowered to the more conservative band whenever the evidence for it was not consistently demonstrated. Must never exceed estimatedLevel. This is the level shown on the student's record."
        ),
      confidence: z
        .enum(CEFR_CONFIDENCE_LEVELS_WITH_UNKNOWN)
        .describe(
          "Confidence in conservativeLevel, given how much and how consistent the evidence in the original writing was. Always High, Medium, or Low for a fresh correction -- \"Unknown\" only ever appears on a correction stored before confidence was tracked."
        ),
      rationale: z
        .string()
        .min(1)
        .describe(
          "A concise explanation of the conservative level; if estimatedLevel and conservativeLevel differ, explain why. Write it in the feedback language specified in the system prompt."
        ),
      evidence: z
        .string()
        .min(1)
        .describe(
          "Concrete evidence from the original writing supporting the assigned level. Write it in the feedback language specified in the system prompt."
        ),
      blocker: z
        .string()
        .min(1)
        .describe(
          "The main feature of the original writing preventing the next CEFR level. Write it in the feedback language specified in the system prompt."
        ),
    })
    // The conservative tie-breaking rule (see the correction prompt's CEFR
    // ASSESSMENT section) can only ever lower the raw estimate, never raise
    // it -- a response that violates this ordering is malformed regardless
    // of what else it got right, so it fails validation the same way a
    // missing field would rather than reaching the learner.
    .refine((cefr) => cefrLevelRank(cefr.conservativeLevel) <= cefrLevelRank(cefr.estimatedLevel), {
      message: "conservativeLevel cannot exceed estimatedLevel.",
      path: ["conservativeLevel"],
    }),
  meetsWordCount: z
    .boolean()
    .describe("Whether the essay's word count falls within the task's required range."),
  wordCountNote: z
    .string()
    .describe("A short note explaining how the word count compares to the target range."),
  errors: z.array(
    z.object({
      originalText: z.string().describe("The erroneous excerpt from the original text."),
      // .nullish() (not .optional()): Gemini's responseSchema declares these
      // as non-required but still fills unset properties with a JSON `null`
      // rather than omitting the key, so the parser must accept null and
      // undefined equally as "no offset available".
      originalStart: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe(
          "When available, the zero-based UTF-16 character index where originalText starts in the student's exact submitted text. Use null when unavailable rather than guessing."
        ),
      correctedText: z.string().describe("The corrected version of that excerpt."),
      correctionStart: z
        .number()
        .int()
        .min(0)
        .nullish()
        .describe(
          "When available, the zero-based UTF-16 character index where correctedText starts in the essay's top-level correctedText field. Use null when unavailable rather than guessing."
        ),
      explanation: z
        .string()
        .describe("A short explanation of the error, written in the feedback language specified in the system prompt."),
      errorType: z.enum(ERROR_CATEGORIES),
    })
  ),
  suggestions: z
    .array(z.string())
    .describe("Actionable suggestions for improving future writing."),
  summary: z
    .string()
    .describe(
      "A brief overall assessment of the essay's strengths and weaknesses, written in the feedback language specified in the system prompt."
    ),
});

export type EssayFeedback = z.infer<typeof essayFeedbackSchema>;
