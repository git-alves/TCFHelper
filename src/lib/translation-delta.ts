// Pure decision logic only -- no fetch, no React state -- so this stays
// unit-testable in a repo with no jsdom/testing-library. Kept separate from
// WritingWorkspace's requestTranslation, which owns the actual API call and
// state updates.
//
// Both `currentText` and `cache.text` are expected to already be trimmed by
// the caller (WritingWorkspace always stores/compares `content.trim()`) --
// given that, a suffix produced by slicing one trimmed string from a prefix
// of another can never be whitespace-only, since neither string can end in
// whitespace. There is deliberately no separate "whitespace-only" case here;
// that scenario collapses into "unchanged" once both sides are trimmed.

export interface TranslationCache {
  text: string;
  locale: string;
}

export type TranslationDelta =
  // The draft is exactly what `cache` already covers -- nothing to do.
  | { kind: "unchanged" }
  // The draft grew by adding text after everything `cache` already covers.
  // Only `textToSend` (the new suffix) needs translating; the caller
  // appends the result to the existing translation.
  | { kind: "append"; textToSend: string }
  // Anything else -- a first translation, an edit earlier in the draft, or
  // a locale switch -- has no reliable boundary to reuse safely, so the
  // whole current draft is retranslated.
  | { kind: "retranslate"; textToSend: string };

/**
 * Decides how much of `currentText` actually needs to be sent to the
 * translation API, given what was translated last (`cache`) -- the core of
 * only ever spending the metered translation quota on wording that hasn't
 * been translated yet.
 */
export function computeTranslationDelta(currentText: string, cache: TranslationCache | null, locale: string): TranslationDelta {
  if (cache && cache.text === currentText && cache.locale === locale) {
    return { kind: "unchanged" };
  }

  const isAppend =
    cache !== null && cache.locale === locale && currentText.startsWith(cache.text) && currentText.length > cache.text.length;

  return isAppend
    ? { kind: "append", textToSend: currentText.slice(cache!.text.length) }
    : { kind: "retranslate", textToSend: currentText };
}
