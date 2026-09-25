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
  requestOpenRouterChatCompletion,
} from "@/lib/providers/openrouter-client";

// Short model answers run far quicker than a full grading response --
// mirrors REQUEST_TIMEOUT_MS in gemini.ts (generateModelAnswer).
const EXAMPLE_REQUEST_TIMEOUT_MS = 20_000;

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
      return await requestOpenRouterChatCompletion({
        apiKey,
        model,
        messages: [{ role: "user", content: buildExamplePrompt(params) }],
        maxTokens: 2048,
        timeoutMs: EXAMPLE_REQUEST_TIMEOUT_MS,
        logLabel: "example generation",
      });
    } catch (error) {
      if (error instanceof OpenRouterRateLimitedError) throw new ExampleProviderRateLimitedError(error.message);
      if (error instanceof OpenRouterRequestError) throw new ExampleProviderRequestError(error.status);
      if (error instanceof OpenRouterTransportError) throw new ExampleProviderTransportError();
      throw error;
    }
  },
};
