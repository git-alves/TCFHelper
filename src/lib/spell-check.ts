import dictionary from "dictionary-fr";
import nspell from "nspell";

/** The small, frontend-facing shape returned by `/api/spell-check`. */
export interface SpellCheckMatch {
  // JavaScript string positions are UTF-16 code units, exactly matching a
  // textarea's selectionStart/selectionEnd. This makes replacement safe for
  // accented words and French apostrophes without a conversion layer.
  offset: number;
  length: number;
  message: string;
  replacements: string[];
  category: "TYPOS";
  ruleId: "HUNSPELL_FR";
  severity: "misspelling";
}

// Hunspell suggestions can be long. The editor needs a few useful choices,
// not an overwhelming menu. Keep the closest distinct choices, including
// accent restorations such as `tres` -> `très`.
const MAX_REPLACEMENTS_PER_MATCH = 5;
const WORD_PATTERN = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;

// nspell is a pure-JS implementation of Hunspell. The dictionary ships as a
// package asset and is loaded in this process: no third-party service, Docker
// container, public URL, or user text leaving this application.
const frenchSpellChecker = nspell(dictionary);

function isAllCapsAbbreviation(word: string) {
  return word.length > 1 && word === word.toLocaleUpperCase("fr-FR") && word !== word.toLocaleLowerCase("fr-FR");
}

function suggestionsFor(word: string): string[] {
  const uniqueSuggestions = Array.from(new Set(frenchSpellChecker.suggest(word)));

  // The dictionary's ordering is mostly useful, but an exact diacritic-only
  // correction is the least surprising choice for learners (tres -> très).
  const accentOnly = uniqueSuggestions.filter(
    (suggestion) => suggestion.normalize("NFD").replace(/\p{M}/gu, "") === word.normalize("NFD").replace(/\p{M}/gu, ""),
  );
  const remaining = uniqueSuggestions.filter((suggestion) => !accentOnly.includes(suggestion));
  return [...accentOnly, ...remaining].slice(0, MAX_REPLACEMENTS_PER_MATCH);
}

/**
 * Finds only misspelled French words. It deliberately does not infer grammar,
 * punctuation, style, or missing words: those require a language-analysis
 * engine and would make a spelling-only control misleading.
 */
export function checkFrenchSpelling(text: string): SpellCheckMatch[] {
  const errors: SpellCheckMatch[] = [];

  for (const token of text.matchAll(WORD_PATTERN)) {
    const word = token[0];
    const offset = token.index;
    if (offset === undefined || isAllCapsAbbreviation(word) || frenchSpellChecker.correct(word)) continue;

    errors.push({
      offset,
      length: word.length,
      message: "Possible spelling mistake.",
      replacements: suggestionsFor(word),
      category: "TYPOS",
      ruleId: "HUNSPELL_FR",
      severity: "misspelling",
    });
  }

  return errors;
}
