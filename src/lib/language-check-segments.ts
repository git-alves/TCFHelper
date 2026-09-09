import type { LanguageCheckMatch } from "@/lib/language-tool";

/** One piece of the editor's text, for rendering in the highlight overlay. */
export interface TextSegment {
  text: string;
  /** Index into the original `matches` array, or `null` for plain text. */
  matchIndex: number | null;
}

/**
 * Turns a list of LanguageTool matches (unsorted, and potentially
 * overlapping or stale) into a flat, ordered list of text segments that
 * together reconstruct `text` exactly once.
 *
 * Two defensive rules keep the overlay correct even when `matches` doesn't
 * perfectly describe `text` (e.g. a debounced response arriving just after
 * the learner typed another character):
 * - A match that falls outside the current text's bounds is dropped rather
 *   than clamped, since clamping could underline the wrong word.
 * - Once a match has claimed a range, any later match (in sorted order)
 *   that starts before that range ends is dropped, so a single character
 *   is never covered by two `<mark>`s at once.
 */
export function buildLanguageCheckSegments(text: string, matches: readonly LanguageCheckMatch[]): TextSegment[] {
  const candidates = matches
    .map((match, index) => ({ match, index }))
    .filter(({ match }) => match.offset >= 0 && match.length > 0 && match.offset + match.length <= text.length)
    // Earlier-starting first; for ties, the longer match wins the range.
    .sort((a, b) => a.match.offset - b.match.offset || b.match.length - a.match.length);

  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const { match, index } of candidates) {
    if (match.offset < cursor) continue; // overlaps a match already placed

    if (match.offset > cursor) {
      segments.push({ text: text.slice(cursor, match.offset), matchIndex: null });
    }
    segments.push({ text: text.slice(match.offset, match.offset + match.length), matchIndex: index });
    cursor = match.offset + match.length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), matchIndex: null });
  }

  return segments;
}
