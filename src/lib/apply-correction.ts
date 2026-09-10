/** The result of applying one spelling replacement to the editor's text. */
export interface AppliedCorrection {
  text: string;
  /** Where the caret should land afterwards -- immediately after the
   * inserted replacement, wherever in the text it was applied. */
  cursorOffset: number;
}

/**
 * Replaces exactly the `[offset, offset + length)` slice of `text` with
 * `replacement`. `offset`/`length` are UTF-16 code-unit positions -- the
 * same indexing a spell-check response and a textarea's
 * `selectionStart` use -- so this never needs to special-case accents or
 * French apostrophes (`l'homme`, `qu'il`, `aujourd'hui`); they are each a
 * single UTF-16 code unit like any other character here.
 */
export function applyLanguageCheckReplacement(
  text: string,
  offset: number,
  length: number,
  replacement: string,
): AppliedCorrection {
  const before = text.slice(0, offset);
  const after = text.slice(offset + length);

  return {
    text: before + replacement + after,
    cursorOffset: before.length + replacement.length,
  };
}
