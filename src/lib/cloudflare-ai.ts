import { buildExamplePrompt, type GenerateModelAnswerParams } from "@/lib/gemini";

const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
const DEFAULT_CLOUDFLARE_MODEL = "@cf/zai-org/glm-4.7-flash";
const REQUEST_TIMEOUT_MS = 20_000;

export class CloudflareNotConfiguredError extends Error {}
export class CloudflareRateLimitedError extends Error {}

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
  const response = await fetch(
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
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );

  if (response.status === 429) {
    throw new CloudflareRateLimitedError("Cloudflare Workers AI free-tier limit reached.");
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Cloudflare Workers AI request failed (${response.status}).`);
  }

  const text = extractText(payload).trim();
  if (!text) {
    throw new Error("Cloudflare Workers AI response contained no text.");
  }

  return text;
}
