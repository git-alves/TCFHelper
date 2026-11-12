import { describe, expect, it } from "vitest";
import {
  CorrectionProviderFormatUnsupportedError,
  CorrectionProviderInvalidJsonError,
  looksLikeJson,
  parseCorrectionJson,
} from "./correction-provider";

describe("looksLikeJson", () => {
  it("accepts content starting with an object or array, ignoring leading whitespace", () => {
    expect(looksLikeJson('{"a":1}')).toBe(true);
    expect(looksLikeJson("[1,2,3]")).toBe(true);
    expect(looksLikeJson('  \n {"a":1}')).toBe(true);
  });

  it("rejects prose or any other non-JSON-looking content", () => {
    expect(looksLikeJson("Sure, here is my assessment of the essay...")).toBe(false);
    expect(looksLikeJson("")).toBe(false);
    expect(looksLikeJson("```json\n{\"a\":1}\n```")).toBe(false);
  });
});

describe("parseCorrectionJson with a code fence", () => {
  it("parses a reply that is only a ```json fenced block, and a plain ``` one", () => {
    expect(parseCorrectionJson('```json\n{"correctedText":"ok"}\n```')).toEqual({ correctedText: "ok" });
    expect(parseCorrectionJson('```\n{"correctedText":"ok"}\n```')).toEqual({ correctedText: "ok" });
  });

  it("still rejects prose, including prose around or inside a fence, as format-unsupported", () => {
    for (const reply of [
      "Sure! Here is my assessment of the essay.",
      'Here you go:\n```json\n{"correctedText":"ok"}\n```',
      '```json\n{"correctedText":"ok"}\n```\nHope that helps',
      "```json\nI cannot provide a JSON response.\n```",
    ]) {
      expect(() => parseCorrectionJson(reply), reply).toThrow(CorrectionProviderFormatUnsupportedError);
    }
  });

  it("a fenced block holding malformed JSON is invalid-JSON, not format-unsupported", () => {
    expect(() => parseCorrectionJson('```json\n{"correctedText": "ok",\n```')).toThrow(CorrectionProviderInvalidJsonError);
  });
});

describe("parseCorrectionJson", () => {
  it("returns the parsed value for well-formed JSON", () => {
    expect(parseCorrectionJson('{"correctedText":"ok"}')).toEqual({ correctedText: "ok" });
  });

  it("throws CorrectionProviderFormatUnsupportedError for content that never attempted JSON", () => {
    expect(() => parseCorrectionJson("I cannot provide a JSON response.")).toThrow(
      CorrectionProviderFormatUnsupportedError,
    );
  });

  it("throws CorrectionProviderInvalidJsonError for a truncated/malformed JSON attempt", () => {
    expect(() => parseCorrectionJson('{"correctedText": "ok"')).toThrow(CorrectionProviderInvalidJsonError);
  });
});
