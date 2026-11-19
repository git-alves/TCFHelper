import { buildExamplePrompt } from "@/lib/gemini";
import {
  ExampleProviderNotConfiguredError,
  ExampleProviderRateLimitedError,
  ExampleProviderRequestError,
  ExampleProviderTransportError,
  type ExampleProvider,
  type ExampleProviderOverrides,
} from "@/lib/example-provider";
import {
  OpenRouterRateLimitedError,
  OpenRouterRequestError,
  OpenRouterTransportError,
  requestOpenRouterChatCompletionDetailed,
  type OpenRouterChatCompletionResult,
} from "@/lib/providers/openrouter-client";

// Short model answers run far quicker than a full grading response --
// mirrors REQUEST_TIMEOUT_MS in gemini.ts (generateModelAnswer).
const EXAMPLE_REQUEST_TIMEOUT_MS = 20_000;
const EXAMPLE_MAX_TOKENS = 8192;
const EXAMPLE_REASONING_MAX_TOKENS = 2048;

function formatCount(value: number | undefined) {
  return value === undefined ? "unknown" : String(value);
}

// The platform log must remain useful for diagnosing a spent reasoning budget
// without retaining any model output, prompt text, key, or other secret.
function logEmptyOutput(result: OpenRouterChatCompletionResult) {
  const reason = result.finishReason ?? result.nativeFinishReason;
  const safeReason = reason && /^[A-Za-z_]{1,40}$/.test(reason) ? reason : "other";
  console.error(
    `OpenRouter example output empty finishReason=${safeReason} ` +
      `promptTokens=${formatCount(result.promptTokens)} ` +
      `completionTokens=${formatCount(result.completionTokens)} ` +
      `reasoningTokens=${formatCount(result.reasoningTokens)}`,
  );
}

function resolveApiKey(overrides?: ExampleProviderOverrides) {
  return overrides?.apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();
}

// Unlike Gemini's fixed free-tier default, OpenRouter fronts hundreds of
// models behind one gateway with no single model that would be a sane
// default for everyone -- an admin selecting this provider must also choose
// a model, either from the admin panel or via OPENROUTER_EXAMPLE_MODEL.
function resolveModel(overrides?: ExampleProviderOverrides) {
  return overrides?.model?.trim() || process.env.OPENROUTER_EXAMPLE_MODEL?.trim() || "";
}

/**
 * ExampleProvider adapter for OpenRouter's unified, OpenAI-compatible
 * chat/completions gateway -- covers any model OpenRouter fronts (Gemini,
 * GPT, Claude, Qwen, etc.) behind a single integration, using the admin's
 * chosen model string as-is.
 */
export const openRouterExampleProvider: ExampleProvider = {
  id: "openrouter",

  hasConfiguredCredentials(overrides) {
    return Boolean(resolveApiKey(overrides)) && Boolean(resolveModel(overrides));
  },

  async generateExample(params, overrides) {
    const apiKey = resolveApiKey(overrides);
    const model = resolveModel(overrides);
    if (!apiKey || !model) {
      throw new ExampleProviderNotConfiguredError("OPENROUTER_API_KEY or a model is not set.");
    }

    try {
      // A single user message, no system role -- mirrors generateModelAnswer
      // in gemini.ts, which sends buildExamplePrompt's combined instructional
      // text as the sole content with no separate systemInstruction.
      const result = await requestOpenRouterChatCompletionDetailed({
        apiKey,
        model,
        messages: [{ role: "user", content: buildExamplePrompt(params) }],
        // Reasoning tokens count toward max_tokens. An 8,192-token envelope
        // leaves room for a complete study answer after a bounded 2,048-token
        // reasoning phase; OpenRouter ignores `reasoning` for models that do
        // not support it.
        maxTokens: EXAMPLE_MAX_TOKENS,
        reasoning: { max_tokens: EXAMPLE_REASONING_MAX_TOKENS },
        timeoutMs: overrides?.requestTimeoutMs ?? EXAMPLE_REQUEST_TIMEOUT_MS,
        logLabel: "example generation",
        retry503: overrides?.retry503,
        totalBudgetMs: overrides?.totalBudgetMs,
      });
      if (!result.content) {
        logEmptyOutput(result);
        throw new OpenRouterRequestError(result.status);
      }
      return result.content;
    } catch (error) {
      if (error instanceof OpenRouterRateLimitedError) throw new ExampleProviderRateLimitedError(error.message);
      if (error instanceof OpenRouterRequestError) throw new ExampleProviderRequestError(error.status);
      if (error instanceof OpenRouterTransportError) throw new ExampleProviderTransportError();
      throw error;
    }
  },

  resolveModel(overrides) {
    return resolveModel(overrides) || null;
  },
};
