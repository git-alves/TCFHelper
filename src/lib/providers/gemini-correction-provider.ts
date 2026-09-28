import {
  GeminiCorrectionParseError,
  GeminiNotConfiguredError,
  GeminiRateLimitedError,
  GeminiRequestError,
  GeminiTransportError,
  gradeEssayWithGemini,
  hasConfiguredGemini,
} from "@/lib/gemini";
import {
  CorrectionProviderInvalidJsonError,
  CorrectionProviderNotConfiguredError,
  CorrectionProviderRateLimitedError,
  CorrectionProviderRequestError,
  CorrectionProviderTransportError,
  type CorrectionProvider,
} from "@/lib/correction-provider";

/**
 * Thin CorrectionProvider wrapper around the existing native Gemini
 * integration (gemini.ts) -- that module is left untouched so its own tests
 * and behavior keep working exactly as before; this file only translates its
 * Gemini-specific error types into the provider-agnostic ones the route
 * catches.
 */
export const geminiCorrectionProvider: CorrectionProvider = {
  id: "gemini",

  hasConfiguredCredentials(overrides) {
    return hasConfiguredGemini(overrides);
  },

  async gradeEssay(params, overrides) {
    try {
      return await gradeEssayWithGemini(params, overrides);
    } catch (error) {
      if (error instanceof GeminiNotConfiguredError) {
        throw new CorrectionProviderNotConfiguredError(error.message);
      }
      if (error instanceof GeminiRateLimitedError) {
        throw new CorrectionProviderRateLimitedError(error.message);
      }
      if (error instanceof GeminiCorrectionParseError) {
        // Gemini's own responseSchema/responseMimeType:"application/json"
        // enforcement means it essentially never just ignores the
        // structured-output request and returns prose the way an
        // OpenRouter-routed model without native support might -- an
        // unparseable body here is a malformed/truncated JSON attempt, not
        // a "didn't try" case, so this always maps to the more specific
        // invalid-JSON classification, never format-unsupported.
        throw new CorrectionProviderInvalidJsonError();
      }
      if (error instanceof GeminiRequestError) {
        throw new CorrectionProviderRequestError(error.status);
      }
      if (error instanceof GeminiTransportError) {
        throw new CorrectionProviderTransportError();
      }
      throw error;
    }
  },
};
