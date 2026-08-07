import { describe, expect, it } from "vitest";
import { getCorrectionRequestKey, normalizeCorrectionInput } from "./correction-request-key";

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
