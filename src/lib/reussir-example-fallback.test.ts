import { describe, expect, it } from "vitest";
import { getReussirExampleFallbackUrl } from "./reussir-example-fallback";

const SOURCE_URL = "https://reussir-tcfcanada.com/aout-2026-expression-ecrite/";

describe("getReussirExampleFallbackUrl", () => {
  it.each(["unavailable", "generic"] as const)("returns the exact trusted source URL for %s", (error) => {
    expect(getReussirExampleFallbackUrl(error, SOURCE_URL)).toBe(SOURCE_URL);
  });

  it.each(["dailyLimit", "rateLimited"] as const)("does not offer a fallback for a %s response", (error) => {
    expect(getReussirExampleFallbackUrl(error, SOURCE_URL)).toBeNull();
  });

  it("does not link to an untrusted or malformed URL", () => {
    expect(getReussirExampleFallbackUrl("unavailable", "https://example.com/aout-2026-expression-ecrite/")).toBeNull();
    expect(getReussirExampleFallbackUrl("unavailable", "https://reussir-tcfcanada.com/aout-2026-correction-expression-ecrite/")).toBeNull();
    expect(getReussirExampleFallbackUrl("unavailable", "not a URL")).toBeNull();
  });
});
