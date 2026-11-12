import { GEMINI_API_BASE } from "@/lib/gemini";
import { OPENROUTER_API_URL } from "@/lib/providers/openrouter-client";
import { unwrapJsonFence } from "@/lib/json-fence";
import { validateApiKey, validateModel, type ModelProvider } from "@/lib/api-key-validation";

// The admin's "Test" button: ONE minimal real call that proves what the section
// needs, with a fixed tiny prompt. It sends no essay or learner data, persists
// nothing, and its result never contains the key.

export type TestSection = "correction" | "example";

export const API_KEY_TEST_TIMEOUT_MS = 20_000;

// Output budget of the test call. The answer itself is a few tokens, but a
// reasoning model spends tokens thinking before it answers, and with a budget
// of a few dozen it would look broken when it is not. 1,024 tokens leaves room
// for a modest reasoning phase while keeping the cost of a test negligible
// (about a thousand output tokens at most). The example check is plain text and
// needs less. The real calls allow 8,192 (correction) and 2,048 (example).
export const API_KEY_TEST_MAX_TOKENS: Record<TestSection, number> = { correction: 1024, example: 512 };

const CORRECTION_PROMPT = 'Reply with exactly this JSON object and nothing else: {"ok": true}';
const EXAMPLE_PROMPT = "Reply with the single word OK.";

// The smallest schema that still proves structured output works: the answer
// must be an object with a boolean "ok".
const TEST_JSON_SCHEMA = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
  additionalProperties: false,
} as const;
const GEMINI_TEST_SCHEMA = { type: "OBJECT", properties: { ok: { type: "BOOLEAN" } }, required: ["ok"] } as const;

export type ApiKeyTestKind =
  | "ok"
  | "not_configured"
  | "invalid_key"
  | "no_credits"
  | "model_not_found"
  | "structured_output_unsupported"
  | "bad_request"
  | "rate_limited"
  | "overloaded"
  | "provider_error"
  | "timeout"
  | "network"
  | "truncated"
  | "unexpected_response";

export interface ApiKeyTestResult {
  ok: boolean;
  kind: ApiKeyTestKind;
  /** A plain-language sentence for the admin. */
  message: string;
  latencyMs: number | null;
  httpStatus: number | null;
  /** The model the provider says it used (or the one tested when it does not say). */
  model: string | null;
}

export interface ApiKeyTestInput {
  section: TestSection;
  provider: ModelProvider;
  apiKey: string;
  model: string;
  fetchImpl?: typeof fetch;
}

const PROVIDER_NAME: Record<ModelProvider, string> = { gemini: "Gemini", openrouter: "OpenRouter" };

// The shortest run of consecutive key characters treated as an echo of the key.
// Real keys are 39 characters or more and made of random-looking characters, so
// a 16-character run (at least 96 bits when drawn from 64 symbols) essentially
// never occurs in ordinary prose, while a shorter run did: with a threshold of 8
// a valid key such as "overload-0123456789abcd" turned the plain sentence "The
// model is overloaded" into "The model is [redacted]ed". Sixteen still catches a
// key quoted in pieces, cut off, or echoed with its ends trimmed.
const MIN_ECHO_LENGTH = 16;
const MAX_PROVIDER_TEXT_SCANNED = 2_000;

// Every form a provider might echo the key back in: as sent, URL-encoded, and
// JSON-escaped (the key charset is narrow enough that these usually coincide,
// but a stored value is never trusted to be as narrow as a freshly typed one).
function keyForms(apiKey: string): string[] {
  const forms = new Set([apiKey, encodeURIComponent(apiKey), JSON.stringify(apiKey).slice(1, -1)]);
  return [...forms].filter((form) => form.length >= 8);
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replaces every run of at least MIN_ECHO_LENGTH consecutive characters that
// also occurs inside `form`, matched without regard to case against the
// ORIGINAL text. A sliding window over the form finds each place any part of it
// appears; overlapping and touching matches are merged so a long echo is
// replaced whole. Nothing is lowercased, so Unicode elsewhere in the message
// (some letters change length when case-folded) can never shift the positions.
// The work is bounded: a key is at most 500 characters and the scanned text at
// most MAX_PROVIDER_TEXT_SCANNED.
function redactEchoesOf(text: string, form: string): string {
  const size = Math.min(MIN_ECHO_LENGTH, form.length);
  const windows = new Set<string>();
  for (let start = 0; start + size <= form.length; start += 1) windows.add(form.slice(start, start + size));

  const spans: [number, number][] = [];
  for (const window of windows) {
    for (const match of text.matchAll(new RegExp(escapeForRegExp(window), "gi"))) {
      spans.push([match.index, match.index + window.length]);
    }
  }
  if (spans.length === 0) return text;

  spans.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span]);
  }

  let out = "";
  let cursor = 0;
  for (const [from, to] of merged) {
    out += text.slice(cursor, from) + "[redacted]";
    cursor = to;
  }
  return out + text.slice(cursor);
}

/**
 * Cleans a provider's own message before it can be shown: the key in any form
 * it might be echoed in (exact, URL-encoded, JSON-escaped, or any run of 16 or
 * more of its consecutive characters), then key-shaped tokens and bearer headers. Exported
 * for tests. (A credential failure never shows the provider's text at all; this
 * covers the other outcomes.)
 */
export function sanitizeProviderMessage(raw: unknown, apiKey: string): string | null {
  if (typeof raw !== "string") return null;
  let text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_PROVIDER_TEXT_SCANNED);
  if (!text) return null;
  for (const form of keyForms(apiKey)) text = redactEchoesOf(text, form);
  text = text
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, "[redacted]")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  return text.length > 200 ? `${text.slice(0, 199)}…` : text;
}

function errorMessageOf(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) return undefined;
  const error = (payload as { error?: unknown }).error;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) return (error as { message?: unknown }).message;
  return undefined;
}

const STRUCTURED_HINT = /response_format|json_schema|structured|schema|require.?param|parameter/i;

function classifyFailure(
  provider: ModelProvider,
  section: TestSection,
  status: number,
  providerMessage: string | null,
): ApiKeyTestKind {
  const text = providerMessage ?? "";
  if (status === 401 || status === 403) return "invalid_key";
  if (status === 402) return "no_credits";
  if (status === 429) return "rate_limited";
  if (status === 503) return "overloaded";
  if (status === 404) {
    // With require_parameters, OpenRouter answers "no endpoints found" for a model
    // none of whose endpoints support the requested response_format.
    return section === "correction" && STRUCTURED_HINT.test(text) ? "structured_output_unsupported" : "model_not_found";
  }
  if (status === 400) {
    if (provider === "gemini" && /api key/i.test(text)) return "invalid_key";
    if (section === "correction" && STRUCTURED_HINT.test(text)) return "structured_output_unsupported";
    if (/model/i.test(text)) return "model_not_found";
    return "bad_request";
  }
  return "provider_error";
}

function describeFailure(
  kind: ApiKeyTestKind,
  provider: ModelProvider,
  model: string,
  status: number | null,
  providerMessage: string | null,
): string {
  const name = PROVIDER_NAME[provider];
  const http = status === null ? "" : ` (HTTP ${status})`;
  // A credential failure never shows the provider's own text: it is the one
  // outcome where that text is most likely to quote the key (or part of it), and
  // our plain-language message already says everything the admin can act on.
  const credentialFailure = kind === "invalid_key" || status === 401 || status === 403;
  const said = providerMessage && !credentialFailure ? ` ${name} said: “${providerMessage}”` : "";
  switch (kind) {
    case "invalid_key":
      return `${name} rejected the API key${http}. Check that it is correct, still active, and ${/^[AEIOU]/i.test(name) ? "an" : "a"} ${name} key.${said}`;
    case "no_credits":
      return `${name} says this account has no credits left${http}. Add credits, then test again.${said}`;
    case "model_not_found":
      return `${name} can't find the model “${model}”${http}. Check the model id.${said}`;
    case "structured_output_unsupported":
      return `This model can't produce structured JSON (response_format json_schema), which essay correction needs${http}. Choose a model that supports structured outputs; it can still work for example generation.${said}`;
    case "bad_request":
      return `${name} refused the request${http}.${said || " Check the model id and the key."}`;
    case "rate_limited":
      return `${name} is rate-limiting this key${http}. Wait a minute and test again.${said}`;
    case "overloaded":
      return `${name} is overloaded right now${http}. This is usually temporary: try again shortly (real requests are retried automatically).${said}`;
    default:
      return `${name} returned an error${http}.${said}`;
  }
}

function result(
  kind: ApiKeyTestKind,
  message: string,
  extra: { latencyMs: number | null; httpStatus: number | null; model: string | null },
): ApiKeyTestResult {
  return { ok: kind === "ok", kind, message, ...extra };
}

type ParsedReply = { content: string; finishReason: string | undefined; echoedModel: string | undefined };

function readOpenRouterReply(payload: unknown): ParsedReply {
  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const choice = Array.isArray(body.choices) ? (body.choices[0] as Record<string, unknown> | undefined) : undefined;
  const message = choice && typeof choice.message === "object" && choice.message !== null ? (choice.message as Record<string, unknown>) : {};
  return {
    content: typeof message.content === "string" ? message.content.trim() : "",
    finishReason: typeof choice?.finish_reason === "string" ? choice.finish_reason : undefined,
    echoedModel: typeof body.model === "string" ? body.model : undefined,
  };
}

function readGeminiReply(payload: unknown): ParsedReply {
  const body = (typeof payload === "object" && payload !== null ? payload : {}) as Record<string, unknown>;
  const candidate = Array.isArray(body.candidates) ? (body.candidates[0] as Record<string, unknown> | undefined) : undefined;
  const parts = candidate && typeof candidate.content === "object" && candidate.content !== null ? (candidate.content as { parts?: unknown }).parts : undefined;
  const text = Array.isArray(parts)
    ? parts
        .filter((part): part is { text: string } => typeof part === "object" && part !== null && (part as { thought?: unknown }).thought !== true && typeof (part as { text?: unknown }).text === "string")
        .map((part) => part.text)
        .join("")
        .trim()
    : "";
  return {
    content: text,
    finishReason: typeof candidate?.finishReason === "string" ? candidate.finishReason : undefined,
    echoedModel: typeof body.modelVersion === "string" ? body.modelVersion : undefined,
  };
}

const TRUNCATED = (finish: string | undefined) => finish === "length" || finish === "MAX_TOKENS";

function buildRequest({ section, provider, apiKey, model }: ApiKeyTestInput): { url: string; init: RequestInit } {
  const maxTokens = API_KEY_TEST_MAX_TOKENS[section];
  const signal = AbortSignal.timeout(API_KEY_TEST_TIMEOUT_MS);

  if (provider === "openrouter") {
    return {
      url: OPENROUTER_API_URL,
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: section === "correction" ? CORRECTION_PROMPT : EXAMPLE_PROMPT }],
          max_tokens: maxTokens,
          // The same two fields a real correction sends, so the test proves the
          // model can honour them: the schema, and routing only to endpoints
          // that support it.
          ...(section === "correction"
            ? {
                response_format: { type: "json_schema", json_schema: { name: "connection_test", schema: TEST_JSON_SCHEMA } },
                provider: { require_parameters: true },
              }
            : {}),
        }),
        cache: "no-store",
        signal,
      },
    };
  }

  return {
    url: `${GEMINI_API_BASE}/${model}:generateContent`,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: section === "correction" ? CORRECTION_PROMPT : EXAMPLE_PROMPT }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          ...(section === "correction" ? { responseMimeType: "application/json", responseSchema: GEMINI_TEST_SCHEMA } : {}),
        },
      }),
      cache: "no-store",
      signal,
    },
  };
}

/**
 * Makes the one test call and turns whatever happens into a result for the
 * admin. Never throws for a provider or network problem; never includes the
 * key. The key and model are re-checked here so a stored value that is not
 * valid (for example a masked placeholder saved by an older version) is
 * reported instead of being sent.
 */
export async function runApiKeyTest(input: ApiKeyTestInput): Promise<ApiKeyTestResult> {
  const { provider, apiKey, model, section } = input;
  const keyProblem = validateApiKey(apiKey);
  if (keyProblem) {
    return result("invalid_key", `The API key to test is not usable: ${keyProblem}`, { latencyMs: null, httpStatus: null, model });
  }
  const modelProblem = validateModel(provider, model);
  if (modelProblem) {
    return result("bad_request", `The model to test is not valid: ${modelProblem}`, { latencyMs: null, httpStatus: null, model });
  }

  const request = buildRequest(input);
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await (input.fetchImpl ?? fetch)(request.url, request.init);
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const name = error instanceof Error ? error.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return result("timeout", `No answer within ${API_KEY_TEST_TIMEOUT_MS / 1000} seconds. The model may be slow, or ${PROVIDER_NAME[provider]} unreachable.`, {
        latencyMs,
        httpStatus: null,
        model,
      });
    }
    return result("network", `Couldn't reach ${PROVIDER_NAME[provider]} from the server. Check the server's network access.`, { latencyMs, httpStatus: null, model });
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const latencyMs = Date.now() - startedAt;
  const extra = { latencyMs, httpStatus: response.status, model };

  // OpenRouter can answer 200 with an embedded error object.
  const embeddedError = response.ok && provider === "openrouter" && typeof payload === "object" && payload !== null && "error" in payload;
  if (!response.ok || embeddedError) {
    let status = response.status;
    if (embeddedError) {
      const code = (payload as { error?: { code?: unknown } }).error?.code;
      status = typeof code === "number" && Number.isInteger(code) && code >= 100 && code <= 599 ? code : 502;
    }
    const providerMessage = sanitizeProviderMessage(errorMessageOf(payload), apiKey);
    const kind = classifyFailure(provider, section, status, providerMessage);
    return result(kind, describeFailure(kind, provider, model, status, providerMessage), { ...extra, httpStatus: status });
  }

  const reply = provider === "openrouter" ? readOpenRouterReply(payload) : readGeminiReply(payload);
  const echoedModel = reply.echoedModel ?? model;
  const withEchoedModel = { ...extra, model: echoedModel };
  const seconds = (latencyMs / 1000).toFixed(1);

  if (!reply.content) {
    if (TRUNCATED(reply.finishReason)) {
      return result(
        "truncated",
        `The model used up the test's ${API_KEY_TEST_MAX_TOKENS[section].toLocaleString("en-US")}-token limit before answering (a reasoning model?). Real ${section === "correction" ? "corrections allow 8,192 tokens" : "examples allow 2,048 tokens"}, so it may still work: try a real one to confirm.`,
        withEchoedModel,
      );
    }
    return result("unexpected_response", `${PROVIDER_NAME[provider]} accepted the request but the model returned an empty answer. Try another model.`, withEchoedModel);
  }

  if (section === "example") {
    return result("ok", `Works. ${echoedModel} answered in ${seconds} s.`, withEchoedModel);
  }

  // Correction: the answer must be JSON that fits the tiny schema. A reply that
  // is only a fenced block counts, as it does for real corrections.
  const candidate = unwrapJsonFence(reply.content);
  let parsed: unknown;
  try {
    parsed = candidate.trimStart().startsWith("{") ? JSON.parse(candidate) : undefined;
  } catch {
    parsed = undefined;
  }
  if (parsed === undefined) {
    if (TRUNCATED(reply.finishReason)) {
      return result(
        "truncated",
        `The model used up the test's ${API_KEY_TEST_MAX_TOKENS[section].toLocaleString("en-US")}-token limit mid-answer. Real corrections allow 8,192 tokens, so it may still work: try a real one to confirm.`,
        withEchoedModel,
      );
    }
    return result(
      "structured_output_unsupported",
      "The model answered, but not as structured JSON, so it ignores response_format json_schema, which essay correction needs. Choose a model that supports structured outputs; it can still work for example generation.",
      withEchoedModel,
    );
  }
  if (typeof parsed !== "object" || parsed === null || typeof (parsed as { ok?: unknown }).ok !== "boolean") {
    return result("unexpected_response", "The model returned JSON, but not in the shape that was asked for, so it does not follow the requested schema reliably.", withEchoedModel);
  }
  return result("ok", `Works. ${echoedModel} answered in ${seconds} s with structured JSON.`, withEchoedModel);
}
