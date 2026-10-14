import { canonicalizeCorrectionInput } from "@/lib/correction-request-key";

/**
 * A new draft counts as "almost identical" to one already corrected when it
 * differs from it by fewer than this share of its characters. A single comma
 * or period is a different correction key (punctuation is part of the key, so
 * a real punctuation fix can be re-assessed), which means it costs another
 * daily correction; the confirm dialog uses this to say so.
 */
export const NEAR_IDENTICAL_MAX_CHANGE_RATIO = 0.02;

/**
 * Whether `current` is a small edit of `previous`: not the same text once
 * formatting-only differences are ignored (that case is already blocked as
 * "already corrected"), but within the change ratio above.
 *
 * Uses a banded edit distance, so cost is O(length x allowed edits) instead of
 * O(length^2) -- a 20,000-character draft stays cheap, and a draft that has
 * obviously changed a lot bails out as soon as the band is exceeded.
 */
export function isNearIdenticalDraft(previous: string, current: string): boolean {
  const a = canonicalizeCorrectionInput(previous);
  const b = canonicalizeCorrectionInput(current);
  if (!a || !b || a === b) return false;

  const longest = Math.max(a.length, b.length);
  // Largest integer edit count strictly below the ratio.
  const maxEdits = Math.ceil(longest * NEAR_IDENTICAL_MAX_CHANGE_RATIO) - 1;
  if (maxEdits < 1) return false;
  if (Math.abs(a.length - b.length) > maxEdits) return false;

  return editDistanceWithin(a, b, maxEdits) !== null;
}

/** Levenshtein distance if it is at most `limit`, otherwise null. */
function editDistanceWithin(a: string, b: string, limit: number): number | null {
  const over = limit + 1;
  let previousRow = new Array<number>(b.length + 1).fill(over);
  let currentRow = new Array<number>(b.length + 1).fill(over);
  for (let j = 0; j <= Math.min(b.length, limit); j += 1) previousRow[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    const from = Math.max(1, i - limit);
    const to = Math.min(b.length, i + limit);
    currentRow.fill(over);
    if (i <= limit) currentRow[0] = i;
    let rowMinimum = currentRow[0];

    for (let j = from; j <= to; j += 1) {
      const substitution = previousRow[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      const deletion = previousRow[j] + 1;
      const insertion = currentRow[j - 1] + 1;
      const value = Math.min(substitution, deletion, insertion, over);
      currentRow[j] = value;
      if (value < rowMinimum) rowMinimum = value;
    }

    if (rowMinimum > limit) return null;
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  const distance = previousRow[b.length];
  return distance <= limit ? distance : null;
}
