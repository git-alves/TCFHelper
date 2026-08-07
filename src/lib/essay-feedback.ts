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
  cefrLevel: z
    .enum(CEFR_LEVELS)
    .describe("The estimated CEFR level (A1-C2) of the original writing sample."),
  meetsWordCount: z
    .boolean()
    .describe("Whether the essay's word count falls within the task's required range."),
  wordCountNote: z
    .string()
    .describe("A short note explaining how the word count compares to the target range."),
  errors: z.array(
    z.object({
      original: z.string().describe("The erroneous excerpt from the original text."),
      originalStart: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          "When available, the zero-based UTF-16 character index where original starts in the student's exact submitted text. Omit this offset rather than guessing."
        ),
      correction: z.string().describe("The corrected version of that excerpt."),
      correctionStart: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          "When available, the zero-based UTF-16 character index where correction starts in correctedText. Omit this offset rather than guessing."
        ),
      explanation: z
        .string()
        .describe("A short explanation of the error, written in the feedback language specified in the system prompt."),
      category: z.enum(ERROR_CATEGORIES),
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
