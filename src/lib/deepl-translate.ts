import type { AppLocale } from "@/lib/app-locale";

const DEEPL_FREE_URL = "https://api-free.deepl.com/v2/translate";

// DeepL requires a region-qualified target for English and Portuguese.
// French is unambiguous as a source language, so it needs no variant.
const DEEPL_TARGET_LANG: Record<Exclude<AppLocale, "fr">, string> = {
  en: "EN-US",
  es: "ES",
  pt: "PT-BR",
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

/** DeepL's documented signal that the account's monthly character quota (API
 * Free: 500,000 characters) has been used up — distinct from a rate limit or
 * an invalid key, and the only case that should trigger the scraper backup. */
export class DeepLQuotaExceededError extends Error {}

export async function translateWithDeepL(
  text: string,
  targetLocale: Exclude<AppLocale, "fr">,
  apiKey: string,
  signal: AbortSignal,
): Promise<string> {
  const response = await fetch(DEEPL_FREE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `DeepL-Auth-Key ${apiKey}`,
    },
    body: JSON.stringify({
      text: [text],
      source_lang: "FR",
      target_lang: DEEPL_TARGET_LANG[targetLocale],
    }),
    signal,
    cache: "no-store",
  });

  if (response.status === 456) {
    throw new DeepLQuotaExceededError("DeepL API Free monthly character quota has been reached.");
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string" ? payload.message : undefined;
    throw new Error(`DeepL translation request failed (${response.status})${message ? `: ${message}` : ""}`);
  }

  const translations = isRecord(payload) ? payload.translations : undefined;
  const first = Array.isArray(translations) ? translations[0] : undefined;
  const translation = isRecord(first) && typeof first.text === "string" ? first.text.trim() : "";

  if (!translation) {
    throw new Error("DeepL translation response contained no translated text.");
  }

  return translation;
}
