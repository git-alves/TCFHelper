import { describe, expect, it } from "vitest";
import { computeTranslationDelta } from "./translation-delta";

describe("computeTranslationDelta", () => {
  it("treats a first translation (no cache) as a full retranslate", () => {
    const result = computeTranslationDelta("Bonjour, ça va ?", null, "en");
    expect(result).toEqual({ kind: "retranslate", textToSend: "Bonjour, ça va ?" });
  });

  it("does nothing when the draft exactly matches the cached translation", () => {
    const result = computeTranslationDelta("Bonjour, ça va ?", { text: "Bonjour, ça va ?", locale: "en" }, "en");
    expect(result).toEqual({ kind: "unchanged" });
  });

  it("retranslates from scratch on a locale switch even with an identical draft", () => {
    const result = computeTranslationDelta("Bonjour, ça va ?", { text: "Bonjour, ça va ?", locale: "en" }, "es");
    expect(result).toEqual({ kind: "retranslate", textToSend: "Bonjour, ça va ?" });
  });

  it("sends only the new suffix when the draft grew by appending text", () => {
    const cache = { text: "Bonjour, ça va ?", locale: "en" };
    const result = computeTranslationDelta("Bonjour, ça va ? Et toi ?", cache, "en");
    expect(result).toEqual({ kind: "append", textToSend: " Et toi ?" });
  });

  it("retranslates the whole draft when earlier text was edited, not just appended", () => {
    const cache = { text: "Bonjour, ça va ?", locale: "en" };
    const result = computeTranslationDelta("Salut, ça va ? Et toi ?", cache, "en");
    expect(result).toEqual({ kind: "retranslate", textToSend: "Salut, ça va ? Et toi ?" });
  });

  it("retranslates the whole draft when text was removed from the end", () => {
    const cache = { text: "Bonjour, ça va ? Et toi ?", locale: "en" };
    const result = computeTranslationDelta("Bonjour, ça va ?", cache, "en");
    expect(result).toEqual({ kind: "retranslate", textToSend: "Bonjour, ça va ?" });
  });

  it("advances the cache without a request when only whitespace was appended", () => {
    const cache = { text: "Bonjour, ça va ?", locale: "en" };
    const result = computeTranslationDelta("Bonjour, ça va ?\n\n", cache, "en");
    expect(result).toEqual({ kind: "whitespace-only" });
  });
});
