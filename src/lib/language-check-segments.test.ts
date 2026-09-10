import { describe, expect, it } from "vitest";
import { buildLanguageCheckSegments } from "@/lib/language-check-segments";
import type { SpellCheckMatch } from "@/lib/spell-check";

function match(offset: number, length: number, overrides: Partial<SpellCheckMatch> = {}): SpellCheckMatch {
  return {
    offset,
    length,
    message: "issue",
    replacements: [],
    category: "TYPOS",
    ruleId: "HUNSPELL_FR",
    severity: "misspelling",
    ...overrides,
  };
}

describe("buildLanguageCheckSegments", () => {
  it("returns a single plain segment when there are no matches", () => {
    expect(buildLanguageCheckSegments("Bonjour le monde", [])).toEqual([
      { text: "Bonjour le monde", matchIndex: null },
    ]);
  });

  it("returns no segments for empty text", () => {
    expect(buildLanguageCheckSegments("", [])).toEqual([]);
  });

  it("places a single match in the middle of the text", () => {
    const segments = buildLanguageCheckSegments("Je suis tres content.", [match(8, 4)]);
    expect(segments).toEqual([
      { text: "Je suis ", matchIndex: null },
      { text: "tres", matchIndex: 0 },
      { text: " content.", matchIndex: null },
    ]);
  });

  it("places a match at the very start of the text", () => {
    const segments = buildLanguageCheckSegments("tres bien", [match(0, 4)]);
    expect(segments[0]).toEqual({ text: "tres", matchIndex: 0 });
  });

  it("places a match at the very end of the text", () => {
    const segments = buildLanguageCheckSegments("Il est parti hier soire", [match(18, 5)]);
    expect(segments.at(-1)).toEqual({ text: "soire", matchIndex: 0 });
  });

  it("handles multiple, non-adjacent errors in the same sentence", () => {
    const text = "Je suit tres content de la situation actuel.";
    const matches = [match(3, 4), match(8, 4)];
    const segments = buildLanguageCheckSegments(text, matches);
    expect(segments.filter((s) => s.matchIndex !== null)).toEqual([
      { text: "suit", matchIndex: 0 },
      { text: "tres", matchIndex: 1 },
    ]);
  });

  it("handles two matches with no gap between them", () => {
    const segments = buildLanguageCheckSegments("abcdef", [match(0, 3), match(3, 3)]);
    expect(segments).toEqual([
      { text: "abc", matchIndex: 0 },
      { text: "def", matchIndex: 1 },
    ]);
  });

  it("sorts out-of-order input matches by offset", () => {
    const segments = buildLanguageCheckSegments("abcdef", [match(3, 3), match(0, 3)]);
    expect(segments.map((s) => s.matchIndex)).toEqual([1, 0]);
  });

  it("drops an overlapping match to avoid duplicated underlines", () => {
    // The second match (offset 1, length 4) overlaps the first (offset 0,
    // length 3); it must be dropped rather than double-underlining "bcd".
    const segments = buildLanguageCheckSegments("abcdef", [match(0, 3), match(1, 4)]);
    expect(segments).toEqual([
      { text: "abc", matchIndex: 0 },
      { text: "def", matchIndex: null },
    ]);
  });

  it("drops a match that falls outside the current text (a stale response)", () => {
    const segments = buildLanguageCheckSegments("short", [match(0, 100)]);
    expect(segments).toEqual([{ text: "short", matchIndex: null }]);
  });

  it("keeps French apostrophes intact across segment boundaries", () => {
    const text = "Aujourd'hui, j'aime la maison de l'homme qu'il a visiter hier.";
    const segments = buildLanguageCheckSegments(text, [match(49, 7)]);
    const rebuilt = segments.map((s) => s.text).join("");
    expect(rebuilt).toBe(text);
    expect(segments.find((s) => s.matchIndex === 0)?.text).toBe("visiter");
  });

  it("preserves accented characters and reconstructs the original text exactly", () => {
    const text = "Il a déja mangé une pomme, n'est-ce pas ?";
    const segments = buildLanguageCheckSegments(text, [match(5, 4)]);
    expect(segments.map((s) => s.text).join("")).toBe(text);
  });
});
