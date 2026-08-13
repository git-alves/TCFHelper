import { describe, expect, it } from "vitest";
import { hasTaskThreeDocuments } from "./task-three-topic";

describe("hasTaskThreeDocuments", () => {
  it("detects the real recent-exam format: a title, then labeled sections each on their own line", () => {
    const topicPrompt =
      "Faut-il interdire les téléphones portables à l'école ?\n\n" +
      "Document 1 :\nLes téléphones distraient les élèves.\n\n" +
      "Document 2 :\nLes téléphones sont des outils pédagogiques utiles.";

    expect(hasTaskThreeDocuments(topicPrompt)).toBe(true);
  });

  it("returns false for ordinary free text with no document sections", () => {
    expect(hasTaskThreeDocuments("Le télétravail devrait-il être généralisé ?")).toBe(false);
  });

  it("returns false when the labels only appear inline, mid-sentence, not on their own line", () => {
    const topicPrompt =
      "Le rapport mentionne Document 1: une étude sur le télétravail et Document 2: une contre-étude, " +
      "mais ne les cite pas intégralement.";

    expect(hasTaskThreeDocuments(topicPrompt)).toBe(false);
  });

  it("returns false when a document section is present but empty", () => {
    const emptyFirstSection = "Document 1 :\n\nDocument 2 :\nLes téléphones sont des outils pédagogiques utiles.";
    const emptySecondSection = "Document 1 :\nLes téléphones distraient les élèves.\n\nDocument 2 :\n";

    expect(hasTaskThreeDocuments(emptyFirstSection)).toBe(false);
    expect(hasTaskThreeDocuments(emptySecondSection)).toBe(false);
  });

  it("returns false when only one of the two labels is present", () => {
    expect(hasTaskThreeDocuments("Document 1 :\nLes téléphones distraient les élèves.")).toBe(false);
  });

  it("returns false when Document 2 appears before Document 1", () => {
    const topicPrompt = "Document 2 :\nUn point de vue.\n\nDocument 1 :\nUn autre point de vue.";

    expect(hasTaskThreeDocuments(topicPrompt)).toBe(false);
  });

  it("still detects the labels case-insensitively and with extra surrounding whitespace", () => {
    const topicPrompt = "  document 1  :  \nPremier point de vue.\n\n  DOCUMENT 2 :\nSecond point de vue.";

    expect(hasTaskThreeDocuments(topicPrompt)).toBe(true);
  });

  it("detects content pasted on the same line as the label, not just on following lines", () => {
    const topicPrompt =
      "Document 1 : Les téléphones distraient les élèves.\n" +
      "Document 2 : Les téléphones sont des outils pédagogiques utiles.";

    expect(hasTaskThreeDocuments(topicPrompt)).toBe(true);
  });

  it("still rejects a mid-sentence mention even when text follows the colon on the same line", () => {
    // The distinguishing factor is the label starting its own line, not
    // whether content follows the colon -- content after the colon is a
    // legitimate document body either way.
    const topicPrompt =
      "Le rapport mentionne Document 1 : une étude sur le télétravail et Document 2 : une contre-étude.";

    expect(hasTaskThreeDocuments(topicPrompt)).toBe(false);
  });

  it("combines same-line content with following lines for the same section", () => {
    const topicPrompt =
      "Document 1 : Premier constat.\nUn développement supplémentaire.\n\nDocument 2 :\nSecond point de vue.";

    expect(hasTaskThreeDocuments(topicPrompt)).toBe(true);
  });

  it("detects documents in a CRLF-encoded topic (e.g. pasted from Windows)", () => {
    const topicPrompt =
      "Faut-il interdire les téléphones portables à l'école ?\r\n\r\n" +
      "Document 1 :\r\nLes téléphones distraient les élèves.\r\n\r\n" +
      "Document 2 :\r\nLes téléphones sont des outils pédagogiques utiles.";

    expect(hasTaskThreeDocuments(topicPrompt)).toBe(true);
  });
});
