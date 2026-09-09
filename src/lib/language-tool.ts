/**
 * Thin client for a self-hosted LanguageTool server (see docker-compose.yml
 * and docs/french-grammar-check.md), plus the mapping from LanguageTool's
 * own JSON shape to the small, frontend-friendly shape this app exposes at
 * `/api/language-check`.
 *
 * Offset note: LanguageTool is a Java service, so `offset`/`length` in its
 * response are UTF-16 code-unit positions -- the exact same indexing a JS
 * string (and an HTMLTextAreaElement's `selectionStart`) already uses. No
 * conversion is needed before applying these offsets to the editor's value,
 * including across French apostrophes (`l'homme`, `qu'il`, `aujourd'hui`),
 * which are a single UTF-16 code unit whichever apostrophe character is used.
 */

/** The clean, frontend-facing shape returned by `/api/language-check`. */
export interface LanguageCheckMatch {
  offset: number;
  length: number;
  message: string;
  replacements: string[];
  category: string;
  ruleId: string;
  severity?: string;
}

/** LanguageTool has no French server configured, or none at all. */
export class LanguageToolNotConfiguredError extends Error {}

// LanguageTool can attach dozens of dictionary-adjacent spelling guesses to
// a single match (see the real "tres" -> "très" response, which lists 40+
// replacements). The editor only ever needs a handful to offer as
// one-click fixes.
const MAX_REPLACEMENTS_PER_MATCH = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toLanguageCheckMatch(rawMatch: unknown): LanguageCheckMatch | null {
  if (!isRecord(rawMatch)) return null;

  const { offset, length } = rawMatch;
  // `length <= 0` can't happen from a real LanguageTool response --
  // org.languagetool.rules.RuleMatch's constructor throws
  // IllegalArgumentException whenever toPos <= fromPos, so every match it
  // produces spans at least one character (missing-word rules flag an
  // adjacent word and replace it with a longer phrase, e.g. ABSENCE_QUE
  // turning "possible il" into "possible qu'il", rather than ever pointing
  // at a zero-width insertion point). This is defense-in-depth against a
  // malformed payload, not a real case this endpoint needs to render.
  if (typeof offset !== "number" || typeof length !== "number" || offset < 0 || length <= 0) {
    return null;
  }

  const rule = isRecord(rawMatch.rule) ? rawMatch.rule : {};
  const category = isRecord(rule.category) ? rule.category : {};

  const replacements = (Array.isArray(rawMatch.replacements) ? rawMatch.replacements : [])
    .map((replacement) => (isRecord(replacement) && typeof replacement.value === "string" ? replacement.value : null))
    .filter((value): value is string => value !== null)
    .slice(0, MAX_REPLACEMENTS_PER_MATCH);

  const message =
    (typeof rawMatch.shortMessage === "string" && rawMatch.shortMessage.trim()) ||
    (typeof rawMatch.message === "string" && rawMatch.message.trim()) ||
    "Possible language issue detected.";

  return {
    offset,
    length,
    message,
    replacements,
    category: typeof category.id === "string" ? category.id : "OTHER",
    ruleId: typeof rule.id === "string" ? rule.id : "UNKNOWN",
    ...(typeof rule.issueType === "string" ? { severity: rule.issueType } : {}),
  };
}

/**
 * Maps a raw LanguageTool `/v2/check` response body into the clean shape
 * this app returns to the frontend. Exported separately from
 * `checkFrenchText` so the mapping itself -- the part with real edge cases
 * (missing fields, oversized replacement lists, malformed matches) -- can be
 * unit-tested against fixture payloads without a network call.
 */
export function mapLanguageToolMatches(payload: unknown): LanguageCheckMatch[] {
  if (!isRecord(payload) || !Array.isArray(payload.matches)) return [];

  return payload.matches
    .map((match) => toLanguageCheckMatch(match))
    .filter((match): match is LanguageCheckMatch => match !== null);
}

/**
 * Sends French text to the self-hosted LanguageTool server configured via
 * `LANGUAGETOOL_URL` and returns the mapped matches. Never falls back to
 * the public LanguageTool API -- if `LANGUAGETOOL_URL` is unset, the feature
 * is disabled rather than silently using a third-party service in
 * production.
 */
export async function checkFrenchText(text: string, signal: AbortSignal): Promise<LanguageCheckMatch[]> {
  const languageToolUrl = process.env.LANGUAGETOOL_URL?.trim();
  if (!languageToolUrl) {
    throw new LanguageToolNotConfiguredError("LANGUAGETOOL_URL is not configured.");
  }

  const response = await fetch(`${languageToolUrl.replace(/\/+$/, "")}/v2/check`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ text, language: "fr" }),
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`LanguageTool request failed (${response.status})`);
  }

  const payload: unknown = await response.json().catch(() => null);
  return mapLanguageToolMatches(payload);
}
