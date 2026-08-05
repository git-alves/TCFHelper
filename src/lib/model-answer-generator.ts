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

/** True when at least one free-tier provider can be called without charging quota. */
export function hasConfiguredModelAnswerProvider() {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      (process.env.CLOUDFLARE_ACCOUNT_ID?.trim() && process.env.CLOUDFLARE_AI_API_TOKEN?.trim()),
  );
}

function validateAnswerLength(text: string, params: GenerateModelAnswerParams) {
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < params.task.minWords || wordCount > params.task.maxWords) {
    throw new ModelAnswerInvalidOutputError(
      `Model answer contains ${wordCount} words; expected ${params.task.minWords}-${params.task.maxWords}.`,
    );
  }
  return text;
}

export async function generatePreferredModelAnswer(
  params: GenerateModelAnswerParams,
): Promise<{ text: string; provider: ModelAnswerProvider }> {
  let geminiFallbackReason: "rateLimited" | "notConfigured";
  try {
    return { text: validateAnswerLength(await generateModelAnswer(params), params), provider: "gemini" };
  } catch (error) {
    // Cloudflare is intentionally a narrow fallback: it protects the feature
    // against Gemini's free-tier limit (or a missing Gemini setup) without
    // masking ordinary Gemini outages as a second paid request path.
    if (!(error instanceof GeminiRateLimitedError || error instanceof GeminiNotConfiguredError)) {
      throw error;
    }
    geminiFallbackReason = error instanceof GeminiRateLimitedError ? "rateLimited" : "notConfigured";
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
      throw new ModelAnswerNotConfiguredError("No model-answer provider is configured.");
    }
    if (error instanceof CloudflareRateLimitedError) {
      throw new ModelAnswerRateLimitedError("All free model-answer providers are rate limited.");
    }
    throw error;
  }
}
