// Matches the Prisma `Locale` enum values so a future per-user persisted
// preference (User.locale) can reuse the same vocabulary without translation.
export const APP_LOCALES = ["en", "fr", "es", "pt"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_APP_LOCALE: AppLocale = "en";

export const APP_LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  pt: "Português",
};

// Full language name for interpolating into Gemini prompts — kept
// separate from the UI label in case they ever need to diverge.
export const APP_LOCALE_LANGUAGE_NAMES: Record<AppLocale, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
};

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value);
}

// Picks the best supported locale from a raw `Accept-Language` header, e.g.
// "fr-CA,fr;q=0.9,en-US;q=0.8". Only the primary subtag (before any "-") is
// matched against APP_LOCALES, in the browser's stated preference order;
// returns null (letting the caller fall back to DEFAULT_APP_LOCALE) when
// none of the browser's preferred languages are supported.
export function pickLocaleFromAcceptLanguage(header: string | null | undefined): AppLocale | null {
  if (!header) return null;

  const entries = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    // q=0 is RFC 7231's explicit "not acceptable" marker, not merely a low
    // preference -- it must exclude the language, not just rank it last.
    .filter((entry) => entry.tag && entry.tag !== "*" && entry.q > 0)
    // Array#sort is stable, so entries with equal q keep the header's
    // original (already preference-ordered) relative order.
    .sort((a, b) => b.q - a.q);

  for (const { tag } of entries) {
    const primary = tag.split("-")[0];
    const match = (APP_LOCALES as readonly string[]).find((locale) => locale === primary);
    if (match) return match as AppLocale;
  }

  return null;
}

export const APP_LOCALE_STORAGE_KEY = "mytcflab:app-locale";

// The cookie lets Server Components render in the learner's selected
// language on the next request. localStorage is retained only to migrate the
// preference stored by the first version of the picker.
export const APP_LOCALE_COOKIE_NAME = "mytcflab_locale";
export const APP_LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export const APP_LOCALE_INTL_TAGS: Record<AppLocale, string> = {
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  pt: "pt-BR",
};

// Shared by the client (to skip a doomed request) and /api/translate (to
// reject it) so the two can never drift out of sync. The editor's own
// maxLength (20,000 chars) is a broad safety cap, not a realistic essay
// length — TCF tasks top out around 180 words (~1,200 chars) — so this
// leaves generous headroom above any real draft without inviting slow or
// expensive live-translation requests on pathological input.
export const TRANSLATABLE_MAX_CHARS = 4000;
