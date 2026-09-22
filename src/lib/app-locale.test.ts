import { describe, expect, it } from "vitest";
import { APP_LOCALES, isAppLocale, pickLocaleFromAcceptLanguage } from "./app-locale";

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

describe("pickLocaleFromAcceptLanguage", () => {
  it("returns null for a missing or empty header", () => {
    expect(pickLocaleFromAcceptLanguage(null)).toBeNull();
    expect(pickLocaleFromAcceptLanguage(undefined)).toBeNull();
    expect(pickLocaleFromAcceptLanguage("")).toBeNull();
  });

  it("matches the primary subtag of a regional tag", () => {
    expect(pickLocaleFromAcceptLanguage("fr-CA")).toBe("fr");
    expect(pickLocaleFromAcceptLanguage("pt-BR")).toBe("pt");
  });

  it("honours explicit q-values over header order", () => {
    expect(pickLocaleFromAcceptLanguage("en;q=0.5,fr;q=0.9")).toBe("fr");
  });

  it("keeps the header's original order for equal q-values", () => {
    expect(pickLocaleFromAcceptLanguage("es,pt")).toBe("es");
    expect(pickLocaleFromAcceptLanguage("pt,es")).toBe("pt");
  });

  it("skips unsupported languages to find a supported one further down the list", () => {
    expect(pickLocaleFromAcceptLanguage("de-DE,de;q=0.9,fr;q=0.8")).toBe("fr");
  });

  it("returns null when no preferred language is supported", () => {
    expect(pickLocaleFromAcceptLanguage("de-DE,ja;q=0.9,*;q=0.1")).toBeNull();
  });

  it("excludes a language explicitly marked not acceptable with q=0", () => {
    expect(pickLocaleFromAcceptLanguage("fr;q=0,de;q=0.5")).toBeNull();
    expect(pickLocaleFromAcceptLanguage("fr;q=0,en;q=0.8")).toBe("en");
  });
});
