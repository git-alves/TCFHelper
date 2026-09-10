import { describe, expect, it } from "vitest";
import { checkFrenchSpelling } from "@/lib/spell-check";

describe("checkFrenchSpelling", () => {
  it("finds a spelling mistake and prioritizes its accented correction", () => {
    expect(checkFrenchSpelling("Je suis tres content.")).toEqual([
      expect.objectContaining({
        offset: 8,
        length: 4,
        message: "Possible spelling mistake.",
        replacements: ["très", "ares", "ires", "ores", "tees"],
        category: "TYPOS",
        ruleId: "HUNSPELL_FR",
        severity: "misspelling",
      }),
    ]);
  });

  it("finds multiple misspellings without changing their UTF-16 offsets", () => {
    const text = "Je suis tres content de cette situaton.";
    const errors = checkFrenchSpelling(text);

    expect(errors.map(({ offset, length }) => text.slice(offset, offset + length))).toEqual(["tres", "situaton"]);
    expect(errors[1].replacements).toContain("situation");
  });

  it("accepts accented French words and apostrophes", () => {
    expect(checkFrenchSpelling("Aujourd'hui, j'aime l'homme français à l'école.")).toEqual([]);
  });

  it("does not pretend to detect a missing word or grammar issue", () => {
    expect(checkFrenchSpelling("Je suis content cette situation.")).toEqual([]);
  });

  it("ignores punctuation and common all-caps abbreviations", () => {
    expect(checkFrenchSpelling("TCF : Bonjour, monde !")).toEqual([]);
  });

  it("returns no errors for empty text and processes a long draft safely", () => {
    expect(checkFrenchSpelling("")).toEqual([]);
    const text = "Bonjour, je suis très content. ".repeat(600);
    expect(checkFrenchSpelling(text)).toEqual([]);
  });
});
