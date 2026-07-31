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

// Full language name for interpolating into prompts sent to Claude — kept
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

export const APP_LOCALE_STORAGE_KEY = "tcfhelper:app-locale";

// Shared by the client (to skip a doomed request) and /api/translate (to
// reject it) so the two can never drift out of sync. The editor's own
// maxLength (20,000 chars) is a broad safety cap, not a realistic essay
// length — TCF tasks top out around 180 words (~1,200 chars) — so this
// leaves generous headroom above any real draft without inviting slow or
// expensive live-translation requests on pathological input.
export const TRANSLATABLE_MAX_CHARS = 4000;
