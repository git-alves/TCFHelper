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
  type GradeEssayParams,
} from "@/lib/correction-provider";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
// Full grading responses run far longer than a short chat reply -- mirrors
// CORRECTION_REQUEST_TIMEOUT_MS in gemini.ts.
const CORRECTION_REQUEST_TIMEOUT_MS = 45_000;
const MAX_OVERLOAD_ATTEMPTS = 2;
const OVERLOAD_RETRY_DELAY_MS = 1_000;

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

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function extractErrorStatus(payload: unknown): number | undefined {
  if (!isRecord(payload) || !isRecord(payload.error)) return undefined;
  const code = payload.error.code;
  return typeof code === "number" && Number.isInteger(code) && code >= 100 && code <= 599 ? code : undefined;
}

function extractContent(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const choice = choices[0];
  if (!isRecord(choice) || !isRecord(choice.message)) return "";
  const content = choice.message.content;
  return typeof content === "string" ? content : "";
}

function requestCorrection(params: GradeEssayParams, apiKey: string, model: string) {
  // The key is sent only via the Authorization header, never embedded in the
  // request body or URL, for the same reason gemini.ts keeps it out of the
  // query string: a URL- or body-adjacent secret is more likely to end up in
  // an access log or proxy trace than a header is.
  return fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "essay_feedback", schema: CORRECTION_JSON_SCHEMA },
      },
      max_tokens: 4096,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(CORRECTION_REQUEST_TIMEOUT_MS),
  });
}

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

    let response: Response;
    try {
      response = await requestCorrection(params, apiKey, model);
    } catch (error) {
      console.error("OpenRouter correction transport failure", error);
      throw new CorrectionProviderTransportError();
    }

    // A 503 usually means the routed model is transiently overloaded --
    // mirrors gradeEssayWithGemini's own single retry (see gemini.ts).
    for (let attempt = 1; response.status === 503 && attempt < MAX_OVERLOAD_ATTEMPTS; attempt++) {
      console.error(`OpenRouter correction overloaded (503), retrying (attempt ${attempt})`);
      await new Promise((resolve) => setTimeout(resolve, OVERLOAD_RETRY_DELAY_MS));
      try {
        response = await requestCorrection(params, apiKey, model);
      } catch (error) {
        console.error("OpenRouter correction transport failure", error);
        throw new CorrectionProviderTransportError();
      }
    }

    if (response.status === 429) {
      throw new CorrectionProviderRateLimitedError("OpenRouter rate limit reached.");
    }

    if (!response.ok) {
      throw new CorrectionProviderRequestError(response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new CorrectionProviderRequestError(response.status);
      }
      console.error("OpenRouter correction body-read transport failure", error);
      throw new CorrectionProviderTransportError();
    }

    // OpenRouter can return a 2xx with an embedded error object for some
    // routing failures (e.g. the selected model rejecting the request)
    // instead of a non-2xx status.
    if (isRecord(payload) && "error" in payload) {
      throw new CorrectionProviderRequestError(extractErrorStatus(payload) ?? 502);
    }

    const content = extractContent(payload).trim();
    if (!content) {
      throw new CorrectionProviderRequestError(response.status);
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new CorrectionProviderParseError();
    }
  },
};
