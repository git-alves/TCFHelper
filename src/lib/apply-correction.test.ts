import { describe, expect, it } from "vitest";
import { applyLanguageCheckReplacement } from "@/lib/apply-correction";

describe("applyLanguageCheckReplacement", () => {
  it("replaces a spelling mistake and places the cursor right after it", () => {
    const result = applyLanguageCheckReplacement("Je suis tres content.", 8, 4, "très");
    expect(result.text).toBe("Je suis très content.");
    expect(result.cursorOffset).toBe(12); // "Je suis très".length
  });

  it("inserts a missing word (LanguageTool replacement longer than the flagged span)", () => {
    const result = applyLanguageCheckReplacement("Je suis content cette situation.", 16, 0, "de ");
    expect(result.text).toBe("Je suis content de cette situation.");
  });

  it("handles a replacement at the very start of the text", () => {
    const result = applyLanguageCheckReplacement("bonjour tout le monde", 0, 1, "B");
    expect(result.text).toBe("Bonjour tout le monde");
    expect(result.cursorOffset).toBe(1);
  });

  it("handles a replacement at the very end of the text", () => {
    const result = applyLanguageCheckReplacement("Il est parti hier soire", 18, 5, "soir");
    expect(result.text).toBe("Il est parti hier soir");
    expect(result.cursorOffset).toBe(22);
  });

  it("handles deletion (an empty replacement removes a duplicated word)", () => {
    const result = applyLanguageCheckReplacement("Je suis suis content.", 8, 5, "");
    expect(result.text).toBe("Je suis content.");
    expect(result.cursorOffset).toBe(8);
  });

  it("preserves accented characters outside the replaced span", () => {
    const result = applyLanguageCheckReplacement("Il a déja mangé une pomme.", 5, 4, "déjà");
    expect(result.text).toBe("Il a déjà mangé une pomme.");
  });

  it("preserves French apostrophes outside the replaced span", () => {
    const text = "Aujourd'hui, j'aime la maison de l'homme qu'il a visiter hier.";
    const result = applyLanguageCheckReplacement(text, 49, 7, "visité");
    expect(result.text).toBe("Aujourd'hui, j'aime la maison de l'homme qu'il a visité hier.");
  });

  it("preserves line breaks elsewhere in the text", () => {
    const result = applyLanguageCheckReplacement("Bonjour,\ntres bien.\nMerci.", 9, 4, "très");
    expect(result.text).toBe("Bonjour,\ntrès bien.\nMerci.");
  });
});
