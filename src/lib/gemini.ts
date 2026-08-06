import type { TaskDefinition } from "@/lib/tcf-tasks";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Google AI Studio's free tier (no credit card, no billing) — kept
// overridable via GEMINI_MODEL since free-tier model names are retired and
// replaced over time.
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const REQUEST_TIMEOUT_MS = 20_000;
// Bump this when the CEFR instructions, answer shape, or primary model policy
// materially changes so learners never receive an answer cached for an older
// rubric or provider setup.
export const MODEL_ANSWER_PROMPT_VERSION = "2026-08-04";

export type ExampleCefrLevel = "B2" | "C1" | "C2";

export class GeminiNotConfiguredError extends Error {}
export class GeminiRateLimitedError extends Error {}

/**
 * Any other Gemini failure (bad request, auth rejection, upstream outage, or
 * an unparseable response). The constructor accepts only the HTTP status —
 * never a message — and builds its own fixed text internally, so it is
 * structurally impossible for a call site to embed Google's own error text
 * (which could echo back part of the request) into this error, now or in
 * the future.
 */
export class GeminiRequestError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Gemini request failed (${status}).`);
    this.status = status;
  }
}

/**
 * The request never reached Gemini or never got a response at all (network
 * failure, DNS failure, or the request timeout) — there is no HTTP status to
 * report. A fixed message only, for the same reason as GeminiRequestError.
 */
export class GeminiTransportError extends Error {
  constructor() {
    super("Gemini request could not be completed.");
  }
}

export interface GenerateModelAnswerParams {
  task: TaskDefinition;
  level: ExampleCefrLevel;
  topicPrompt: string;
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

const LEVEL_DESCRIPTIONS: Record<ExampleCefrLevel, string> = {
  B2: "a clear, well-organized response with a reasoned viewpoint, mostly accurate grammar, and a good range of everyday and some abstract vocabulary — solid but not yet native-like nuance.",
  C1: "a fluent, well-structured response with effective connectors, precise and varied vocabulary, and controlled complex grammar, handling abstract ideas with clarity and flexibility.",
  C2: "a highly nuanced, idiomatic response with sophisticated structure, subtle register control, and a near-native command of complex grammar and vocabulary.",
};

export function buildExamplePrompt({ task, level, topicPrompt }: GenerateModelAnswerParams): string {
  return (
    "You are a TCF (Test de Connaissance du Français) examiner writing a model answer for a learner to " +
    "study.\n" +
    `Task: ${task.label} - ${task.title}\n` +
    `Instructions: ${task.description}\n` +
    `Required length: ${task.minWords}-${task.maxWords} words.\n` +
    `Topic:\n${topicPrompt}\n\n` +
    "Write a complete, natural, well-structured French response to this exact topic. The response must " +
    `authentically demonstrate CEFR level ${level}: ${LEVEL_DESCRIPTIONS[level]}\n` +
    "Stay within the required word range. Return only the French response text itself — no title, no " +
    "explanation, no markdown formatting."
  );
}

function extractText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  const candidates = payload.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  const content = candidates[0];
  if (!isRecord(content) || !isRecord(content.content)) return "";

  const parts = content.content.parts;
  if (!Array.isArray(parts) || parts.length === 0) return "";

  const firstPart = parts[0];
  return isRecord(firstPart) && typeof firstPart.text === "string" ? firstPart.text : "";
}

/**
 * Generates a French model answer via the Gemini API's free tier — kept as
 * a separate provider from Anthropic (used for grading) specifically so this
 * button never adds to the app's paid model spend.
 */
export async function generateModelAnswer(params: GenerateModelAnswerParams): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiNotConfiguredError("GEMINI_API_KEY is not set.");
  }

  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  // The key is sent only via the x-goog-api-key header, never as a ?key=
  // query parameter: a URL-embedded secret is far more likely to end up in
  // an access log or proxy trace than a header is.
  let response: Response;
  try {
    response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildExamplePrompt(params) }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new GeminiTransportError();
  }

  if (response.status === 429) {
    throw new GeminiRateLimitedError("Gemini free-tier rate limit reached.");
  }

  if (!response.ok) {
    throw new GeminiRequestError(response.status);
  }

  // A response object alone only proves the headers arrived; reading the
  // body can still fail (a dropped connection or the timeout firing mid
  // stream). A SyntaxError means the body was fully read but wasn't valid
  // JSON — a request-level problem, same as any other unusable response.
  // Anything else means the body was never actually read — a transport
  // failure, not a status-based one.
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new GeminiRequestError(response.status);
    }
    throw new GeminiTransportError();
  }

  const text = extractText(payload).trim();
  if (!text) {
    throw new GeminiRequestError(response.status);
  }

  return text;
}
