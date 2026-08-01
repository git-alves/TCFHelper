import { translate } from "@vitalets/google-translate-api";
import type { AppLocale } from "@/lib/app-locale";

/**
 * Backup translation path used only when DeepL is unconfigured or its
 * monthly quota is exhausted. It calls Google Translate's public web
 * endpoint directly (the same one translate.google.com uses) with no API
 * key and no billing. Unlike a credentialed API, this has no SLA, is against
 * Google's Translate ToS, and can be rate-limited, blocked, or broken by an
 * upstream change at any time — the caller must treat it strictly as a
 * stopgap (see the durable circuit breaker in translation-fallback-circuit.ts)
 * and disclose its use to the learner, not as a primary provider.
 */
export async function translateWithUnofficialScraper(
  text: string,
  targetLocale: Exclude<AppLocale, "fr">,
  signal: AbortSignal,
): Promise<string> {
  const result = await translate(text, {
    from: "fr",
    to: targetLocale,
    fetchOptions: { signal },
  });

  const translation = result.text?.trim();
  if (!translation) {
    throw new Error("The unofficial translation fallback returned no text.");
  }

  return translation;
}
