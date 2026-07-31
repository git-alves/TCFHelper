import { describe, expect, it } from "vitest";
import { APP_LOCALES, isAppLocale } from "./app-locale";

describe("isAppLocale", () => {
  it("accepts every supported locale code", () => {
    for (const locale of APP_LOCALES) {
      expect(isAppLocale(locale)).toBe(true);
    }
  });

  it("rejects unsupported or malformed values", () => {
    expect(isAppLocale("de")).toBe(false);
    expect(isAppLocale("EN")).toBe(false);
    expect(isAppLocale("")).toBe(false);
    expect(isAppLocale(null)).toBe(false);
    expect(isAppLocale(undefined)).toBe(false);
    expect(isAppLocale(42)).toBe(false);
  });
});
