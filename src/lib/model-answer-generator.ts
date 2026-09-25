import type { GenerateModelAnswerParams } from "@/lib/gemini";
import {
  ExampleProviderNotConfiguredError,
  ExampleProviderRateLimitedError,
  type ExampleProvider,
  type ExampleProviderId,
  type ExampleProviderOverrides,
} from "@/lib/example-provider";

export type ModelAnswerProvider = ExampleProviderId;

export class ModelAnswerNotConfiguredError extends Error {}
export class ModelAnswerRateLimitedError extends Error {}
export class ModelAnswerInvalidOutputError extends Error {}

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

/**
 * Generates a length-validated example answer through the given
 * ExampleProvider (see example-provider-registry.ts for how the caller
 * resolves which one to use). The length-tolerance rule applies uniformly
 * regardless of provider, so it stays here rather than duplicated in each
 * adapter.
 */
export async function generatePreferredModelAnswer(
  provider: ExampleProvider,
  params: GenerateModelAnswerParams,
  overrides?: ExampleProviderOverrides,
): Promise<{ text: string; provider: ModelAnswerProvider }> {
  try {
    const text = validateAnswerLength(await provider.generateExample(params, overrides), params);
    return { text, provider: provider.id };
  } catch (error) {
    if (error instanceof ExampleProviderNotConfiguredError) {
      throw new ModelAnswerNotConfiguredError(error.message);
    }
    if (error instanceof ExampleProviderRateLimitedError) {
      throw new ModelAnswerRateLimitedError(error.message);
    }
    throw error;
  }
}
