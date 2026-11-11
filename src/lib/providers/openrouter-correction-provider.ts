import { z } from "zod";
import { freshEssayFeedbackSchema } from "@/lib/essay-feedback";
import {
  CorrectionProviderFormatUnsupportedError,
  CorrectionProviderInvalidJsonError,
  CorrectionProviderNotConfiguredError,
  CorrectionProviderOutputTruncatedError,
  CorrectionProviderRateLimitedError,
  CorrectionProviderRequestError,
  CorrectionProviderTransportError,
  parseCorrectionJson,
  type CorrectionProvider,
  type CorrectionProviderOverrides,
} from "@/lib/correction-provider";
import {
  OpenRouterRateLimitedError,
  OpenRouterRequestError,
  OpenRouterTransportError,
  requestOpenRouterChatCompletionDetailed,
  type OpenRouterChatCompletionResult,
} from "@/lib/providers/openrouter-client";

// Full grading responses run far longer than a short chat reply -- mirrors
// CORRECTION_REQUEST_TIMEOUT_MS in gemini.ts.
const CORRECTION_REQUEST_TIMEOUT_MS = 45_000;

// OpenRouter normalizes a max_tokens cut-off to finish_reason "length"; the
// routed provider's own value (e.g. Gemini's "MAX_TOKENS") can also surface
// as native_finish_reason.
function wasCutOffAtOutputLimit(result: OpenRouterChatCompletionResult) {
  return [result.finishReason, result.nativeFinishReason].some(
    (reason) => reason === "length" || reason === "MAX_TOKENS",
  );
}

function formatCount(value: number | undefined) {
  return value === undefined ? "unknown" : String(value);
}

// One platform-log line with only the finish reason and token counts --
// never the model's text or anything from the learner's essay.
function logOutputTruncated(result: OpenRouterChatCompletionResult, hadContent: boolean) {
  const reason = result.finishReason ?? result.nativeFinishReason;
  const safeReason = reason && /^[A-Za-z_]{1,40}$/.test(reason) ? reason : "other";
  console.error(
    `OpenRouter correction output truncated${hadContent ? "" : " (no text)"} ` +
      `finishReason=${safeReason} promptTokens=${formatCount(result.promptTokens)} ` +
      `completionTokens=${formatCount(result.completionTokens)} reasoningTokens=${formatCount(result.reasoningTokens)}`,
  );
}

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

    let result: OpenRouterChatCompletionResult;
    try {
      result = await requestOpenRouterChatCompletionDetailed({
        apiKey,
        model,
        messages: [
          { role: "system", content: params.systemPrompt },
          { role: "user", content: params.userPrompt },
        ],
        // A full correction returns the corrected text, a model version,
        // every reported error and the CEFR commentary, which for a long
        // Tâche 3 essay can exceed the previous 4096-token cap. 8192 is an
        // operational choice that gives headroom over the estimated
        // worst-case correction; thinking/reasoning tokens count toward this
        // cap on a reasoning model. A larger generation also raises latency
        // and timeout risk, so watch the "output truncated" log line before
        // raising it further. Matches gradeEssayWithGemini's budget.
        maxTokens: 8192,
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

    const truncated = wasCutOffAtOutputLimit(result);
    if (!result.content) {
      if (truncated) {
        logOutputTruncated(result, false);
        throw new CorrectionProviderOutputTruncatedError();
      }
      throw new CorrectionProviderRequestError(result.status);
    }

    try {
      return parseCorrectionJson(result.content);
    } catch (error) {
      if (
        truncated &&
        (error instanceof CorrectionProviderInvalidJsonError || error instanceof CorrectionProviderFormatUnsupportedError)
      ) {
        logOutputTruncated(result, true);
        throw new CorrectionProviderOutputTruncatedError();
      }
      throw error;
    }
  },

  resolveModel(overrides) {
    return resolveModel(overrides) || null;
  },
};
