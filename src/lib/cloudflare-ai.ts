import { buildExamplePrompt, type GenerateModelAnswerParams } from "@/lib/gemini";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
const DEFAULT_CLOUDFLARE_MODEL = "@cf/zai-org/glm-4.7-flash";
const REQUEST_TIMEOUT_MS = 20_000;

export class CloudflareNotConfiguredError extends Error {}
export class CloudflareRateLimitedError extends Error {}

/**
 * Any other Cloudflare failure. The message is always fixed and built
 * internally from only the status — see GeminiRequestError for why that
 * must be structural, not conventional. `payloadShape`, when present, is a
 * separate, equally-closed-set diagnostic (booleans, counts, and a small
 * fixed-vocabulary finish_reason) describing which expected fields a 200
 * response was missing — never the response's own text.
 */
export class CloudflareRequestError extends Error {
  readonly status: number;
  readonly payloadShape?: string;
  constructor(status: number, payloadShape?: string) {
    super(`Cloudflare Workers AI request failed (${status}).`);
    this.status = status;
    this.payloadShape = payloadShape;
  }
}

/** The request never reached Cloudflare or never got a response at all. See
 * GeminiTransportError for why there is no status to report. */
export class CloudflareTransportError extends Error {
  constructor() {
    super("Cloudflare Workers AI request could not be completed.");
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function extractText(payload: unknown): string {
  if (!isRecord(payload) || !isRecord(payload.result)) return "";

  // Workers AI's direct /ai/run endpoint wraps chat-completion output in a
  // result envelope. Some models use the simpler `response` field instead,
  // so support both documented shapes.
  if (typeof payload.result.response === "string") return payload.result.response;
  const choices = payload.result.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const first = choices[0];
  if (!isRecord(first) || !isRecord(first.message)) return "";
  return typeof first.message.content === "string" ? first.message.content : "";
}

// finish_reason is documented as a small fixed vocabulary, but it still
// comes from the upstream response -- whitelisting against known values
// (rather than trusting any string) is what actually keeps this closed-set,
// not just the comment saying so.
const KNOWN_FINISH_REASONS = new Set(["stop", "length", "content_filter", "tool_calls"]);

/**
 * Only field presence/type/count and a whitelisted finish_reason -- never
 * the response's own text or an unrecognized finish_reason value verbatim.
 * This is what lets a 200-but-empty response stay diagnosable (e.g. a
 * reasoning model spending its whole token budget on hidden reasoning,
 * which typically shows up as finish_reason "length" with no message
 * content) without risking a future accidental content leak.
 */
function describeCloudflarePayloadShape(payload: unknown): string {
  if (!isRecord(payload)) return "not_an_object";

  // typeof-gated, like every other field here: payload.success is untrusted
  // upstream data, and String(x) on an arbitrary value (a string, an
  // object, ...) would stringify whatever that value actually is rather
  // than a fixed label.
  const success = typeof payload.success === "boolean" ? String(payload.success) : "not_boolean";
  const parts = [`success=${success}`];
  if (Array.isArray(payload.errors)) parts.push(`errors_count=${payload.errors.length}`);

  if (!isRecord(payload.result)) {
    parts.push("has_result=false");
    return parts.join(" ");
  }

  parts.push(`has_response_field=${typeof payload.result.response === "string"}`);
  const choices = payload.result.choices;
  parts.push(`choices_count=${Array.isArray(choices) ? choices.length : "n/a"}`);
  const first = Array.isArray(choices) ? choices[0] : undefined;
  if (isRecord(first)) {
    parts.push(`has_message=${isRecord(first.message)}`);
    if (isRecord(first.message)) {
      parts.push(`has_message_content=${typeof first.message.content === "string"}`);
      parts.push(`has_reasoning_content=${typeof first.message.reasoning_content === "string"}`);
    }
    const finishReason =
      typeof first.finish_reason === "string" && KNOWN_FINISH_REASONS.has(first.finish_reason)
        ? first.finish_reason
        : "n/a";
    parts.push(`finish_reason=${finishReason}`);
  }

  return parts.join(" ");
}

/** Calls Workers AI only after the Gemini free tier is unavailable. */
export async function generateModelAnswerWithCloudflare(
  params: GenerateModelAnswerParams,
): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_AI_API_TOKEN?.trim();
  if (!accountId || !apiToken) {
    throw new CloudflareNotConfiguredError("Cloudflare Workers AI is not configured.");
  }

  const model = process.env.CLOUDFLARE_AI_MODEL?.trim() || DEFAULT_CLOUDFLARE_MODEL;
  let response: Response;
  try {
    response = await fetch(
      `${CLOUDFLARE_API_BASE}/${encodeURIComponent(accountId)}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: buildExamplePrompt(params) }],
          temperature: 0.7,
          max_completion_tokens: 512,
          // The default model is a reasoning model; without this, it can
          // spend its entire completion budget on hidden reasoning tokens
          // and return no usable final content at all. "low" is the value
          // documented as universally supported across reasoning models
          // (unlike newer additions such as "minimal", not guaranteed here).
          reasoning_effort: "low",
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );
  } catch {
    throw new CloudflareTransportError();
  }

  if (response.status === 429) {
    throw new CloudflareRateLimitedError("Cloudflare Workers AI free-tier limit reached.");
  }

  if (!response.ok) {
    throw new CloudflareRequestError(response.status);
  }

  // See gemini.ts's generateModelAnswer for why a body-read failure must be
  // split from a status-based one: a SyntaxError means the body was fully
  // read but wasn't valid JSON; anything else means it was never read at
  // all, which is a transport failure.
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CloudflareRequestError(response.status);
    }
    throw new CloudflareTransportError();
  }

  const text = extractText(payload).trim();
  if (!text) {
    throw new CloudflareRequestError(response.status, describeCloudflarePayloadShape(payload));
  }

  return text;
}
