import {
  DEFAULT_GEMINI_MODEL,
  GeminiNotConfiguredError,
  GeminiRateLimitedError,
  GeminiRequestError,
  GeminiTransportError,
  generateModelAnswer,
  hasConfiguredGemini,
} from "@/lib/gemini";
import {
  ExampleProviderNotConfiguredError,
  ExampleProviderRateLimitedError,
  ExampleProviderRequestError,
  ExampleProviderTransportError,
  type ExampleProvider,
} from "@/lib/example-provider";

/**
 * Thin ExampleProvider wrapper around the existing native Gemini integration
 * (gemini.ts) -- that module is left untouched so its own tests and behavior
 * keep working exactly as before; this file only translates its
 * Gemini-specific error types into the provider-agnostic ones
 * model-answer-generator.ts catches.
 */
export const geminiExampleProvider: ExampleProvider = {
  id: "gemini",

  hasConfiguredCredentials(overrides) {
    return hasConfiguredGemini(overrides);
  },

  async generateExample(params, overrides) {
    try {
      return await generateModelAnswer(params, overrides);
    } catch (error) {
      if (error instanceof GeminiNotConfiguredError) {
        throw new ExampleProviderNotConfiguredError(error.message);
      }
      if (error instanceof GeminiRateLimitedError) {
        throw new ExampleProviderRateLimitedError(error.message);
      }
      if (error instanceof GeminiRequestError) {
        throw new ExampleProviderRequestError(error.status);
      }
      if (error instanceof GeminiTransportError) {
        throw new ExampleProviderTransportError();
      }
      throw error;
    }
  },

  resolveModel(overrides) {
    // Mirrors generateModelAnswer's own resolution (see gemini.ts) --
    // duplicated rather than imported since gemini.ts has no exported
    // resolver for it, and this is the one place outside that module that
    // needs to know the answer without also making a request.
    return overrides?.model?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  },
};
