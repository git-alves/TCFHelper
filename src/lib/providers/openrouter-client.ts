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
 * means (structured JSON to parse, or plain example text).
 */
export async function requestOpenRouterChatCompletion(options: OpenRouterChatCompletionOptions): Promise<string> {
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

  const content = extractContent(payload).trim();
  if (!content) {
    throw new OpenRouterRequestError(response.status);
  }

  return content;
}
