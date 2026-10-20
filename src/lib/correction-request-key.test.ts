import { describe, expect, it } from "vitest";
import {
  canonicalizeCorrectionInput,
  getCorrectionRequestKey,
  normalizeCorrectionInput,
} from "./correction-request-key";

const baseInput = {
  taskType: "TASK_2",
  topic: { kind: "custom" as const, prompt: "Vous écrivez à votre voisin." },
  content: "Bonjour,\n\nJe vous écris aujourd'hui.",
};

describe("normalizeCorrectionInput", () => {
  it("normalizes line endings, Unicode composition, and outer whitespace", () => {
    expect(normalizeCorrectionInput("  Cafe\u0301\r\nBonjour  ")).toBe("Café\nBonjour");
  });

  it("keeps meaningful internal whitespace and paragraph changes", () => {
    expect(normalizeCorrectionInput("Bonjour\n\nBonsoir")).not.toBe(
      normalizeCorrectionInput("Bonjour\nBonsoir"),
    );
  });
});

describe("getCorrectionRequestKey", () => {
  it("matches an unchanged correction context after transport-only normalization", () => {
    const key = getCorrectionRequestKey(baseInput);
    const equivalentKey = getCorrectionRequestKey({
      ...baseInput,
      content: "  Bonjour,\r\n\r\nJe vous écris aujourd'hui.  ",
    });

    expect(equivalentKey).toBe(key);
  });

  it("changes when the learner changes text or grading context", () => {
    const key = getCorrectionRequestKey(baseInput);

    expect(getCorrectionRequestKey({ ...baseInput, content: "Bonjour, je vous écris demain." })).not.toBe(key);
    expect(
      getCorrectionRequestKey({
        ...baseInput,
        topic: { kind: "recent", id: "topic_123" },
      }),
    ).not.toBe(key);
  });

  it("does not create a key for incomplete correction inputs", () => {
    expect(getCorrectionRequestKey({ ...baseInput, content: "  " })).toBeNull();
    expect(getCorrectionRequestKey({ ...baseInput, topic: null })).toBeNull();
  });
});

describe("canonicalizeCorrectionInput", () => {
  it.each([
    ["a doubled space", "Je vais  bien."],
    ["a tab instead of a space", "Je vais\tbien."],
    ["a non-breaking space", "Je vais\u00A0bien."],
    ["a narrow no-break space", "Je vais\u202Fbien."],
    ["trailing spaces on a line", "Je vais bien.  "],
    ["CRLF line endings", "Je vais bien.\r\n"],
  ])("treats %s as the same text", (_label, variant) => {
    expect(canonicalizeCorrectionInput(variant)).toBe(canonicalizeCorrectionInput("Je vais bien."));
  });

  it("keeps every line break, so paragraph structure stays distinct", () => {
    expect(canonicalizeCorrectionInput("Bonjour,\n\nMerci.")).not.toBe(
      canonicalizeCorrectionInput("Bonjour,\nMerci."),
    );
    expect(canonicalizeCorrectionInput("Bonjour,\n\n\nMerci.")).not.toBe(
      canonicalizeCorrectionInput("Bonjour,\n\nMerci."),
    );
  });

  it.each([
    ["deleting the space between two words", "Je vaisbien."],
    ["changing a word", "Je vais mal."],
    ["changing capitalisation", "je vais bien."],
    ["changing punctuation", "Je vais bien!"],
    ["removing the space before punctuation", "Je vais bien ."],
    ["changing an apostrophe style", "L\u2019homme"],
  ])("still treats %s as a different text", (_label, variant) => {
    expect(canonicalizeCorrectionInput(variant)).not.toBe(canonicalizeCorrectionInput("Je vais bien."));
  });

  it("leaves already-clean text exactly as before, so previously stored key hashes keep matching", () => {
    const clean = "Bonjour,\n\nJe vous écris aujourd'hui.";
    expect(canonicalizeCorrectionInput(clean)).toBe(normalizeCorrectionInput(clean));
  });
});

describe("getCorrectionRequestKey formatting equivalence", () => {
  it("keeps one key across formatting-only edits, for the content and a custom topic", () => {
    const key = getCorrectionRequestKey(baseInput);

    expect(
      getCorrectionRequestKey({
        ...baseInput,
        topic: { kind: "custom", prompt: "Vous  écrivez à votre\u00A0voisin. " },
        content: "Bonjour,\n\nJe vous  écris   aujourd'hui.  ",
      }),
    ).toBe(key);
  });

  it("changes when the learner deletes the space between two words", () => {
    expect(getCorrectionRequestKey({ ...baseInput, content: "Bonjour,\n\nJe vousécris aujourd'hui." })).not.toBe(
      getCorrectionRequestKey(baseInput),
    );
  });
});
