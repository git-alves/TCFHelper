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
      correction: z.string().describe("The corrected version of that excerpt."),
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
