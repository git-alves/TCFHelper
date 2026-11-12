import { describe, expect, it } from "vitest";
import { API_KEY_MIN_LENGTH, validateApiKey, validateModel } from "./api-key-validation";

describe("validateApiKey", () => {
  it("accepts real-looking keys, and exactly the minimum length", () => {
    expect(validateApiKey("sk-or-v1-0123456789abcdefghij0123456789")).toBeNull();
    expect(validateApiKey("AIzaSyA-0123456789abcdefghijklmnopqrst")).toBeNull();
    expect(validateApiKey("a".repeat(API_KEY_MIN_LENGTH))).toBeNull();
    expect(validateApiKey("a".repeat(API_KEY_MIN_LENGTH - 1))).toMatch(/too short/);
  });

  it("states each rule in words the admin can act on, naming none of the value", () => {
    expect(validateApiKey("••••abcd")).toMatch(/masked key/);
    expect(validateApiKey(`${"a".repeat(25)} ${"b".repeat(5)}`)).toMatch(/spaces or line breaks/);
    expect(validateApiKey(`${"a".repeat(25)} b`)).toMatch(/spaces or line breaks/); // a non-breaking space is whitespace
    expect(validateApiKey(`${"a".repeat(25)}é`)).toMatch(/letters, digits, dots, underscores and hyphens/);
    expect(validateApiKey(`${"a".repeat(25)}\u0000`)).toMatch(/letters, digits, dots, underscores and hyphens/); // a control character
    expect(validateApiKey("x".repeat(501))).toMatch(/too long/);
  });
});

describe("validateApiKey: the key charset (letters, digits, dot, underscore, hyphen)", () => {
  // Shaped like real keys: OpenRouter is sk-or-v1- plus 64 hex characters, Gemini
  // starts AIza and is base64url-like (letters, digits, hyphen, underscore).
  // Built at run time rather than written out, so no literal in the repository
  // looks like a real credential to a secret scanner.
  const HEX_64 = "0123456789abcdef".repeat(4);
  const REAL_FORMAT_KEYS = [
    ["sk", "or", "v1", HEX_64].join("-"),
    ["AIza", "Sy", "D-", "9".repeat(10), "A".repeat(10), "-", "b".repeat(8)].join(""),
    ["AIza", "Sy", "A_", "z".repeat(31)].join(""),
    ["sk", "or", "v1", HEX_64.split("").reverse().join("")].join("-"),
  ];


  it.each(REAL_FORMAT_KEYS)("accepts a real-format key (%s)", (key) => {
    expect(validateApiKey(key)).toBeNull();
  });

  it.each([
    ["a question mark", "sk-or-v1-0123456789abcdef?x=1"],
    ["a percent sign", "sk-or-v1-0123456789abcdef%2F"],
    ["a slash", "sk-or-v1-0123456789abc/def"],
    ["a plus sign", "sk-or-v1-0123456789abcd+ef"],
    ["an equals sign", "sk-or-v1-0123456789abcd=ef"],
    ["a quote", 'sk-or-v1-0123456789abcd"ef'],
    ["a backslash", "sk-or-v1-0123456789abcd\\ef"],
    ["an ampersand", "sk-or-v1-0123456789abcd&ef"],
    ["a colon", "sk-or-v1-0123456789abcd:ef"],
    ["an at sign", "sk-or-v1-0123456789abcd@ef"],
    ["a space", "sk-or-v1-0123456789 abcdef"],
  ])("rejects a key with %s", (_label, key) => {
    const message = validateApiKey(key);

    expect(message).not.toBeNull();
    expect(message).not.toContain(key);
  });

  it("explains the charset when a special character is the problem", () => {
    expect(validateApiKey("sk-or-v1-0123456789abc/def")).toContain("letters, digits, dots, underscores and hyphens");
  });
});

describe("validateModel", () => {
  it("accepts vendor/model with an optional :variant for OpenRouter, and one segment for Gemini", () => {
    for (const model of ["qwen/qwen3-30b-a3b", "meta-llama/llama-3.3-70b-instruct:free", "openai/gpt-4o-mini", "x-ai/grok-4.1-fast"]) {
      expect(validateModel("openrouter", model), model).toBeNull();
    }
    for (const model of ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemma-3-27b-it"]) {
      expect(validateModel("gemini", model), model).toBeNull();
    }
  });

  it("rejects what cannot be a model id, or could alter a URL", () => {
    for (const model of ["", "a", "a/b/c", "a/", "/b", "a b/c", "a/b?x=1", "a/b#c", "a/b%2F", "a/b&c", "a/..", "../a", "a/b:", "a/b:c:d", "é/é"]) {
      expect(validateModel("openrouter", model), model).not.toBeNull();
    }
    for (const model of ["", "a/b", "a b", "a?x", "a:b", "..", "a..b", "é"]) {
      expect(validateModel("gemini", model), model).not.toBeNull();
    }
  });

  it("limits the length", () => {
    expect(validateModel("gemini", "g".repeat(201))).toMatch(/too long/);
    expect(validateModel("openrouter", `v/${"m".repeat(250)}`)).toMatch(/too long/);
  });
});
