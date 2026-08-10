import {
  GeminiNotConfiguredError,
  GeminiRateLimitedError,
  generateModelAnswer,
  hasConfiguredGemini,
  type GenerateModelAnswerParams,
} from "@/lib/gemini";

export type ModelAnswerProvider = "gemini";

export class ModelAnswerNotConfiguredError extends Error {}
export class ModelAnswerRateLimitedError extends Error {}
export class ModelAnswerInvalidOutputError extends Error {}

/** True when the configured Gemini model can be called. */
export function hasConfiguredModelAnswerProvider() {
  return hasConfiguredGemini();
}

// Free-tier models frequently miss an exact word target by a modest margin
// even when explicitly instructed, so a hard cutoff at the task's boundary
// rejected usable answers far too often. This tolerance only catches
// genuinely degenerate output (near-empty or wildly overlong), not ordinary
// model imprecision.
const LENGTH_TOLERANCE = 0.2;

function validateAnswerLength(text: string, params: GenerateModelAnswerParams) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  // Round the bounds inward (not outward) so the tolerance never exceeds
  // LENGTH_TOLERANCE for a non-round task range.
  const minAllowed = Math.ceil(params.task.minWords * (1 - LENGTH_TOLERANCE));
  const maxAllowed = Math.floor(params.task.maxWords * (1 + LENGTH_TOLERANCE));
  if (wordCount < minAllowed || wordCount > maxAllowed) {
    throw new ModelAnswerInvalidOutputError(
      `Model answer contains ${wordCount} words; expected roughly ${params.task.minWords}-${params.task.maxWords}.`,
    );
  }
  return text;
}

export async function generatePreferredModelAnswer(
  params: GenerateModelAnswerParams,
): Promise<{ text: string; provider: ModelAnswerProvider }> {
  try {
    return { text: validateAnswerLength(await generateModelAnswer(params), params), provider: "gemini" };
  } catch (error) {
    if (error instanceof GeminiNotConfiguredError) {
      throw new ModelAnswerNotConfiguredError("Gemini is not configured.");
    }
    if (error instanceof GeminiRateLimitedError) {
      throw new ModelAnswerRateLimitedError("Gemini is rate limited.");
    }
    throw error;
  }
}
