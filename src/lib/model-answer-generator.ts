import {
  GeminiNotConfiguredError,
  GeminiRateLimitedError,
  generateModelAnswer,
  type GenerateModelAnswerParams,
} from "@/lib/gemini";
import {
  CloudflareNotConfiguredError,
  CloudflareRateLimitedError,
  generateModelAnswerWithCloudflare,
} from "@/lib/cloudflare-ai";

export type ModelAnswerProvider = "gemini" | "cloudflare";

export class ModelAnswerNotConfiguredError extends Error {}
export class ModelAnswerRateLimitedError extends Error {}
export class ModelAnswerInvalidOutputError extends Error {}

export type GeminiFallbackReason = "rateLimited" | "notConfigured" | "invalidOutput";

/**
 * Thrown when Cloudflare's failure isn't already covered by a more specific
 * ModelAnswer* error above. Carries why Gemini was skipped in the first
 * place (a fixed, closed-set reason — never free text) alongside Cloudflare's
 * own error, so a caller logging this can report both provider failures in
 * one line instead of only ever seeing Cloudflare's, which was otherwise the
 * only piece of the failure the caller had any visibility into.
 */
export class ModelAnswerBothProvidersFailedError extends Error {
  readonly geminiReason: GeminiFallbackReason;
  readonly cloudflareError: unknown;
  constructor(geminiReason: GeminiFallbackReason, cloudflareError: unknown) {
    super("Both Gemini and Cloudflare failed to produce a model answer.");
    this.geminiReason = geminiReason;
    this.cloudflareError = cloudflareError;
  }
}

/** True when at least one free-tier provider can be called without charging quota. */
export function hasConfiguredModelAnswerProvider() {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      (process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_AI_API_TOKEN?.trim()),
  );
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
  let geminiFallbackReason: GeminiFallbackReason;
  try {
    return { text: validateAnswerLength(await generateModelAnswer(params), params), provider: "gemini" };
  } catch (error) {
    // Cloudflare is intentionally a narrow fallback, per product decision:
    // it covers Gemini's free-tier limit, a missing Gemini setup, or an
    // out-of-range answer, but an ordinary Gemini request failure (bad
    // request, auth rejection, upstream outage) is not retried against a
    // second provider — that would send the learner's prompt to Cloudflare
    // and spend its quota even when the real problem is on Gemini's side.
    if (
      !(
        error instanceof GeminiRateLimitedError ||
        error instanceof GeminiNotConfiguredError ||
        error instanceof ModelAnswerInvalidOutputError
      )
    ) {
      throw error;
    }
    geminiFallbackReason =
      error instanceof GeminiRateLimitedError
        ? "rateLimited"
        : error instanceof GeminiNotConfiguredError
          ? "notConfigured"
          : "invalidOutput";
  }

  try {
    return {
      text: validateAnswerLength(await generateModelAnswerWithCloudflare(params), params),
      provider: "cloudflare",
    };
  } catch (error) {
    if (error instanceof CloudflareNotConfiguredError) {
      if (geminiFallbackReason === "rateLimited") {
        throw new ModelAnswerRateLimitedError("Gemini is rate limited and Cloudflare is not configured.");
      }
      if (geminiFallbackReason === "notConfigured") {
        throw new ModelAnswerNotConfiguredError("No model-answer provider is configured.");
      }
      throw new ModelAnswerInvalidOutputError("Gemini's answer was an unusable length and Cloudflare is not configured.");
    }
    if (error instanceof CloudflareRateLimitedError) {
      // Cloudflare's own 429 is unambiguous and retryable regardless of why
      // Gemini was skipped, so it always maps to the busy/rate-limit error,
      // not the generic failure Gemini's invalid output would otherwise
      // produce.
      throw new ModelAnswerRateLimitedError("All free model-answer providers are rate limited.");
    }
    if (error instanceof ModelAnswerInvalidOutputError) {
      // Cloudflare's own answer failed validateAnswerLength above -- already
      // a specific, dedicated classification in its own right, not a
      // generic Cloudflare request failure to wrap with why Gemini was
      // skipped.
      throw error;
    }
    throw new ModelAnswerBothProvidersFailedError(geminiFallbackReason, error);
  }
}
