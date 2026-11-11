// Low-level request/retry/error-handling shared by every OpenRouter-backed
// adapter (correction, example generation, and any future one) -- the part
// that's identical regardless of what the caller does with the response
// content (JSON.parse it, or use it as plain text). Kept provider-agnostic
// (no CorrectionProvider/ExampleProvider-specific error types here); each
// adapter translates these into its own error hierarchy.
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_OVERLOAD_ATTEMPTS = 2;
const OVERLOAD_RETRY_DELAY_MS = 1_000;

export class OpenRouterRateLimitedError extends Error {}

/**
 * OpenRouter responded with a non-2xx status (or a 2xx with an embedded
 * error object -- see extractErrorStatus below). The constructor accepts
 * only the HTTP status -- never a message -- so OpenRouter's or the routed
 * model's own error text (which could echo back part of the request) can
 * never reach a log or a learner.
 */
export class OpenRouterRequestError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`OpenRouter request failed (${status}).`);
    this.status = status;
  }
}

/**
 * The request never reached OpenRouter or never received a response at all
 * (network failure, DNS failure, or a request timeout) -- there is no HTTP
 * status to report.
 */
export class OpenRouterTransportError extends Error {}

export interface OpenRouterChatMessage {
  role: "system" | "user";
  content: string;
}

export interface OpenRouterChatCompletionOptions {
  apiKey: string;
  model: string;
  messages: OpenRouterChatMessage[];
  maxTokens: number;
  timeoutMs: number;
  responseFormat?: Record<string, unknown>;
  /** Distinguishes this call's transport-failure log lines from another adapter's (e.g. "correction" vs "example generation"). */
  logLabel: string;
}

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

/** Why generation stopped and how many tokens it used -- never any content. */
export interface OpenRouterChatCompletionResult {
  content: string;
  /** HTTP status of the response, for callers that treat an empty body as a request failure. */
  status: number;
  /** choices[0].finish_reason: OpenRouter's normalized value ("stop", "length", ...). */
  finishReason?: string;
  /** choices[0].native_finish_reason: the routed provider's own value (e.g. "MAX_TOKENS"). */
  nativeFinishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  /** usage.completion_tokens_details.reasoning_tokens, when the routed model reports it. */
  reasoningTokens?: number;
}

function extractChoiceString(payload: unknown, key: "finish_reason" | "native_finish_reason"): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return undefined;
  const choice = payload.choices[0];
  return isRecord(choice) && typeof choice[key] === "string" ? (choice[key] as string) : undefined;
}

function tokenCountOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function extractUsage(payload: unknown) {
  const usage = isRecord(payload) && isRecord(payload.usage) ? payload.usage : {};
  const details = isRecord(usage.completion_tokens_details) ? usage.completion_tokens_details : {};
  return {
    promptTokens: tokenCountOrUndefined(usage.prompt_tokens),
    completionTokens: tokenCountOrUndefined(usage.completion_tokens),
    reasoningTokens: tokenCountOrUndefined(details.reasoning_tokens),
  };
}

function request(options: OpenRouterChatCompletionOptions) {
  // The key is sent only via the Authorization header, never embedded in the
  // request body or URL: a URL- or body-adjacent secret is more likely to
  // end up in an access log or proxy trace than a header is.
  return fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${options.apiKey}` },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
      max_tokens: options.maxTokens,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(options.timeoutMs),
  });
}

/**
 * Sends one OpenRouter chat/completions request and returns the raw
 * `choices[0].message.content` string. The caller decides what that content
 * means (structured JSON to parse, or plain example text). An empty content
 * is a request failure here.
 */
export async function requestOpenRouterChatCompletion(options: OpenRouterChatCompletionOptions): Promise<string> {
  const result = await requestOpenRouterChatCompletionDetailed(options);
  if (!result.content) {
    throw new OpenRouterRequestError(result.status);
  }
  return result.content;
}

/**
 * Same request, retries and error handling as requestOpenRouterChatCompletion,
 * but also returns the finish reason and token usage, and does not treat an
 * empty content as a failure -- a response cut off at max_tokens can arrive
 * with no content at all, and the caller needs to see why. Used by the
 * correction adapter; the example adapter keeps the string-only variant.
 */
export async function requestOpenRouterChatCompletionDetailed(
  options: OpenRouterChatCompletionOptions,
): Promise<OpenRouterChatCompletionResult> {
  let response: Response;
  try {
    response = await request(options);
  } catch (error) {
    console.error(`OpenRouter ${options.logLabel} transport failure`, error);
    throw new OpenRouterTransportError();
  }

  // A 503 usually means the routed model is transiently overloaded -- mirrors
  // gemini.ts's own single retry for the equivalent Gemini call.
  for (let attempt = 1; response.status === 503 && attempt < MAX_OVERLOAD_ATTEMPTS; attempt++) {
    console.error(`OpenRouter ${options.logLabel} overloaded (503), retrying (attempt ${attempt})`);
    await new Promise((resolve) => setTimeout(resolve, OVERLOAD_RETRY_DELAY_MS));
    try {
      response = await request(options);
    } catch (error) {
      console.error(`OpenRouter ${options.logLabel} transport failure`, error);
      throw new OpenRouterTransportError();
    }
  }

  if (response.status === 429) {
    throw new OpenRouterRateLimitedError("OpenRouter rate limit reached.");
  }

  if (!response.ok) {
    throw new OpenRouterRequestError(response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new OpenRouterRequestError(response.status);
    }
    console.error(`OpenRouter ${options.logLabel} body-read transport failure`, error);
    throw new OpenRouterTransportError();
  }

  // OpenRouter can return a 2xx with an embedded error object for some
  // routing failures (e.g. the selected model rejecting the request)
  // instead of a non-2xx status.
  if (isRecord(payload) && "error" in payload) {
    throw new OpenRouterRequestError(extractErrorStatus(payload) ?? 502);
  }

  return {
    content: extractContent(payload).trim(),
    status: response.status,
    finishReason: extractChoiceString(payload, "finish_reason"),
    nativeFinishReason: extractChoiceString(payload, "native_finish_reason"),
    ...extractUsage(payload),
  };
}
