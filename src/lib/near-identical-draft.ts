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
 * Uses a banded edit distance (see editDistanceWithin), so cost is
 * O(length x allowed edits) instead of O(length^2), and a draft that has
 * obviously changed a lot bails out as soon as the band is exceeded.
 */
export function isNearIdenticalDraft(previous: string, current: string): boolean {
  const canonicalPrevious = canonicalizeCorrectionInput(previous);
  const canonicalCurrent = canonicalizeCorrectionInput(current);
  if (!canonicalPrevious || !canonicalCurrent || canonicalPrevious === canonicalCurrent) return false;

  // The allowed edits are a share of the WHOLE draft, but the distance only
  // depends on what differs, so shared text at either end is trimmed first. A
  // localized fix (one comma) then compares a handful of characters.
  let start = 0;
  const shortest = Math.min(canonicalPrevious.length, canonicalCurrent.length);
  while (start < shortest && canonicalPrevious[start] === canonicalCurrent[start]) start += 1;
  let endPrevious = canonicalPrevious.length;
  let endCurrent = canonicalCurrent.length;
  while (
    endPrevious > start &&
    endCurrent > start &&
    canonicalPrevious[endPrevious - 1] === canonicalCurrent[endCurrent - 1]
  ) {
    endPrevious -= 1;
    endCurrent -= 1;
  }
  const a = canonicalPrevious.slice(start, endPrevious);
  const b = canonicalCurrent.slice(start, endCurrent);

  const longest = Math.max(canonicalPrevious.length, canonicalCurrent.length);
  // Largest integer edit count strictly below the ratio.
  const maxEdits = Math.ceil(longest * NEAR_IDENTICAL_MAX_CHANGE_RATIO) - 1;
  if (maxEdits < 1) return false;
  if (Math.abs(a.length - b.length) > maxEdits) return false;
  if (a.length === 0 || b.length === 0) return a.length + b.length <= maxEdits;

  return editDistanceWithin(a, b, maxEdits) !== null;
}

/**
 * Levenshtein distance if it is at most `limit`, otherwise null.
 *
 * Only the cells within `limit` of the diagonal can hold a distance <= limit,
 * so each row reads and writes just that band: O(length x limit) time. The two
 * rows are allocated and filled once; per row, the single cell just left of
 * the band is reset (it can hold a stale value from two rows back), and cells
 * to the right of the band were never written by an earlier row, so they still
 * hold the "over the limit" sentinel. Clearing the whole row on every
 * iteration would make this O(length^2).
 */
function editDistanceWithin(
  a: string,
  b: string,
  limit: number,
  stats?: { cellWrites: number },
): number | null {
  const over = limit + 1;
  let previousRow = new Array<number>(b.length + 1).fill(over);
  let currentRow = new Array<number>(b.length + 1).fill(over);
  for (let j = 0; j <= Math.min(b.length, limit); j += 1) previousRow[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    const from = Math.max(1, i - limit);
    const to = Math.min(b.length, i + limit);
    let rowMinimum = over;

    if (stats) stats.cellWrites += 1; // the one reset cell below
    if (from === 1) {
      currentRow[0] = i <= limit ? i : over;
      if (currentRow[0] < rowMinimum) rowMinimum = currentRow[0];
    } else {
      currentRow[from - 1] = over;
    }

    for (let j = from; j <= to; j += 1) {
      const substitution = previousRow[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      const deletion = previousRow[j] + 1;
      const insertion = currentRow[j - 1] + 1;
      const value = Math.min(substitution, deletion, insertion, over);
      currentRow[j] = value;
      if (stats) stats.cellWrites += 1;
      if (value < rowMinimum) rowMinimum = value;
    }

    if (rowMinimum > limit) return null;
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  const distance = previousRow[b.length];
  return distance <= limit ? distance : null;
}

// Exposed so tests can compare the banded result against a plain full-table
// edit distance. Not part of the module's public use.
export const editDistanceWithinForTesting = editDistanceWithin;
