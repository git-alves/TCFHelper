import { z } from "zod";
import { freshEssayFeedbackSchema } from "@/lib/essay-feedback";
import {
  CorrectionProviderNotConfiguredError,
  CorrectionProviderParseError,
  CorrectionProviderRateLimitedError,
  CorrectionProviderRequestError,
  CorrectionProviderTransportError,
  type CorrectionProvider,
  type CorrectionProviderOverrides,
} from "@/lib/correction-provider";
import {
  OpenRouterRateLimitedError,
  OpenRouterRequestError,
  OpenRouterTransportError,
  requestOpenRouterChatCompletion,
} from "@/lib/providers/openrouter-client";

// Full grading responses run far longer than a short chat reply -- mirrors
// CORRECTION_REQUEST_TIMEOUT_MS in gemini.ts.
const CORRECTION_REQUEST_TIMEOUT_MS = 45_000;

function resolveApiKey(overrides?: CorrectionProviderOverrides) {
  return overrides?.apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();
}

// Unlike Gemini's fixed free-tier default, OpenRouter fronts hundreds of
// models behind one gateway with no single model that would be a sane
// default for everyone -- an admin selecting this provider must also choose
// a model, either from the admin panel or via OPENROUTER_CORRECTION_MODEL.
function resolveModel(overrides?: CorrectionProviderOverrides) {
  return overrides?.model?.trim() || process.env.OPENROUTER_CORRECTION_MODEL?.trim() || "";
}

// Derived once from freshEssayFeedbackSchema (essay-feedback.ts) -- the same
// zod schema the route validates every provider's response against -- so
// this structured-output constraint can never drift the way gemini.ts's
// hand-mirrored CORRECTION_RESPONSE_SCHEMA could: Gemini's own schema format
// only accepts a narrow OpenAPI subset, so that one has to be hand-kept in
// sync instead.
const CORRECTION_JSON_SCHEMA = z.toJSONSchema(freshEssayFeedbackSchema);

/**
 * CorrectionProvider adapter for OpenRouter's unified, OpenAI-compatible
 * chat/completions gateway -- covers any model OpenRouter fronts (Gemini,
 * GPT, Claude, Qwen, etc.) behind a single integration, using the admin's
 * chosen model string as-is.
 */
export const openRouterCorrectionProvider: CorrectionProvider = {
  id: "openrouter",

  hasConfiguredCredentials(overrides) {
    return Boolean(resolveApiKey(overrides)) && Boolean(resolveModel(overrides));
  },

  async gradeEssay(params, overrides) {
    const apiKey = resolveApiKey(overrides);
    const model = resolveModel(overrides);
    if (!apiKey || !model) {
      throw new CorrectionProviderNotConfiguredError("OPENROUTER_API_KEY or a model is not set.");
    }

    let content: string;
    try {
      content = await requestOpenRouterChatCompletion({
        apiKey,
        model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        maxTokens: 4096,
        timeoutMs: CORRECTION_REQUEST_TIMEOUT_MS,
        responseFormat: {
          type: "json_schema",
          json_schema: { name: "essay_feedback", schema: CORRECTION_JSON_SCHEMA },
        },
        logLabel: "correction",
      });
    } catch (error) {
      if (error instanceof OpenRouterRateLimitedError) throw new CorrectionProviderRateLimitedError(error.message);
      if (error instanceof OpenRouterRequestError) throw new CorrectionProviderRequestError(error.status);
      if (error instanceof OpenRouterTransportError) throw new CorrectionProviderTransportError();
      throw error;
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new CorrectionProviderParseError();
    }
  },
};
