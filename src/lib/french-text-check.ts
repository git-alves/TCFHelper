/**
 * A cheap, dependency-free guess at whether a submission is French, used to
 * refuse a correction before it spends a provider request or a quota slot.
 * Shared by the client (instant feedback) and /api/essays/correct (the
 * authority, since the client can be bypassed).
 *
 * It is deliberately a coarse gate for "this is not even French" -- English,
 * another language, another script, keyboard mashing -- not a quality check.
 * A weak, error-filled French draft must still pass so the model can correct
 * it, so the check only blocks what is clearly not French. Function words are
 * the signal because they make up a large, stable share of any real French
 * text and survive spelling and grammar mistakes.
 */
export type FrenchTextCheck =
  | { ok: true }
  | { ok: false; reason: "script" | "language" };

// Share of the letters that must be Latin before a language guess is even
// attempted; below this the text is mostly another script (Cyrillic, CJK,
// Arabic, ...) or has no letters at all.
const MIN_LATIN_LETTER_SHARE = 0.8;
// Below this share of French function words the text has essentially no
// French in it. A real attempt, however error-filled, sits far above: even
// the weakest sample here is over 0.4. Gibberish, keyboard mashing and
// another language sit near zero.
const MIN_FRENCH_WORD_SHARE = 0.05;
// Real French uses several different function words; one repeated word
// ("le le le") must not pass.
const MIN_DISTINCT_FRENCH_WORDS = 3;
// Another language only counts as "dominant" when it is this common in the
// text AND clearly outweighs French. Spanish, Portuguese and Italian share
// words such as "de", "la" and "que" with French, so a draft that merely
// mixes in a learner's native language is not rejected.
const MIN_DOMINANT_COMPETITOR_SHARE = 0.2;
const COMPETITOR_DOMINANCE_FACTOR = 1.3;

// Elided clitics are split off as their own token ("l'école" -> "l'" +
// "école"), which is how they appear in the lists below.
const FRENCH_WORDS = new Set([
  "le", "la", "les", "l'", "de", "d'", "des", "du", "un", "une", "et", "est", "en", "au", "aux",
  "je", "j'", "tu", "il", "elle", "nous", "vous", "ils", "elles", "on", "me", "m'", "te", "t'", "se", "s'",
  "ce", "c'", "cet", "cette", "ces", "ça", "cela", "ne", "n'", "pas", "plus", "que", "qu'", "qui", "quoi",
  "dans", "pour", "par", "sur", "avec", "sans", "sous", "chez", "vers", "entre", "mais", "ou", "où", "donc",
  "car", "comme", "si", "très", "aussi", "bien", "tout", "tous", "toute", "toutes", "mon", "ma", "mes",
  "ton", "ta", "tes", "son", "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs", "sont", "ont",
  "être", "avoir", "fait", "peut", "faut", "était", "été", "à", "y",
]);

// Closely related and widely used languages a learner might paste by
// mistake. Only their most frequent function words are needed: the lists
// exist to tell "French" apart from "something else that merely shares a few
// words with French", not to identify the language.
const COMPETING_LANGUAGE_WORDS: Record<string, Set<string>> = {
  english: new Set([
    "the", "and", "of", "to", "in", "is", "that", "it", "for", "was", "with", "as", "are", "this", "be",
    "have", "not", "but", "you", "they", "we", "at", "by", "an", "from", "or", "which", "will", "would",
    "can", "their", "there", "i", "my", "your", "he", "she", "his", "her", "has", "had", "do", "what",
  ]),
  spanish: new Set([
    "de", "la", "el", "que", "y", "en", "los", "las", "un", "una", "por", "con", "para", "es", "no", "se",
    "del", "su", "al", "más", "pero", "como", "lo", "muy", "yo", "tu", "mi", "este", "esta", "son", "fue",
  ]),
  portuguese: new Set([
    "de", "a", "o", "e", "que", "do", "da", "em", "um", "uma", "para", "com", "não", "os", "as", "se", "na",
    "no", "por", "mais", "mas", "foi", "ao", "eu", "você", "muito", "são", "é", "dos", "das", "meu", "minha",
  ]),
  italian: new Set([
    "di", "e", "il", "che", "la", "un", "una", "per", "non", "con", "sono", "del", "della", "le", "in", "è",
    "lo", "gli", "ma", "più", "io", "mi", "ti", "ci", "questo", "questa", "anche", "come", "dei", "delle",
  ]),
  dutch: new Set([
    "de", "het", "een", "en", "van", "ik", "te", "dat", "die", "niet", "zijn", "op", "aan", "met", "voor",
    "ook", "maar", "om", "ze", "wat", "je", "we", "hij", "dit", "was", "heb", "bij", "naar", "geen", "wij",
  ]),
  german: new Set([
    "der", "die", "das", "und", "ist", "nicht", "ich", "ein", "eine", "zu", "mit", "auf", "für", "von",
    "den", "dem", "sich", "auch", "es", "sie", "wir", "er", "aber", "oder", "wie", "wird", "sind", "im",
  ]),
};

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      // Split elisions off ("qu'il" -> "qu'" "il"); also folds the typographic
      // apostrophe the editor and mobile keyboards produce.
      .replace(/(\p{L}+)['’]/gu, "$1' ")
      .match(/\p{L}+'?/gu) ?? []
  );
}

function share(tokens: string[], words: ReadonlySet<string>): number {
  if (tokens.length === 0) return 0;
  let hits = 0;
  for (const token of tokens) if (words.has(token)) hits += 1;
  return hits / tokens.length;
}

export function checkFrenchText(rawText: string): FrenchTextCheck {
  // Some sources (macOS, PDFs, certain keyboards) store "é" as "e" plus a
  // combining accent. Letter matching would then stop mid-word and lose
  // accented function words such as "très", "à" and "été".
  const text = rawText.normalize("NFC");
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return { ok: false, reason: "script" };

  const latinLetters = text.match(/\p{Script=Latin}/gu) ?? [];
  if (latinLetters.length / letters.length < MIN_LATIN_LETTER_SHARE) {
    return { ok: false, reason: "script" };
  }

  const tokens = tokenize(text);
  const frenchShare = share(tokens, FRENCH_WORDS);
  const distinctFrenchWords = new Set(tokens.filter((token) => FRENCH_WORDS.has(token))).size;
  const strongestCompetitorShare = Math.max(
    ...Object.values(COMPETING_LANGUAGE_WORDS).map((words) => share(tokens, words)),
  );

  // Deliberately conservative: rejecting a genuine French attempt costs the
  // learner far more than letting an uncertain Latin-script draft through.
  // Only text with almost no French, or in which another language clearly
  // dominates French, is blocked.
  const hasAlmostNoFrench =
    frenchShare < MIN_FRENCH_WORD_SHARE || distinctFrenchWords < MIN_DISTINCT_FRENCH_WORDS;
  const anotherLanguageDominates =
    strongestCompetitorShare >= MIN_DOMINANT_COMPETITOR_SHARE &&
    strongestCompetitorShare > frenchShare * COMPETITOR_DOMINANCE_FACTOR;
  const looksFrench = !hasAlmostNoFrench && !anotherLanguageDominates;

  return looksFrench ? { ok: true } : { ok: false, reason: "language" };
}
