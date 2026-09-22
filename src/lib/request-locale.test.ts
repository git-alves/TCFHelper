import { describe, expect, it, vi } from "vitest";

const { cookies, headers } = vi.hoisted(() => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies, headers }));

function cookieStore(value: string | undefined) {
  return { get: () => (value === undefined ? undefined : { value }) };
}

function headerStore(acceptLanguage: string | null) {
  return { get: () => acceptLanguage };
}

describe("getRequestLocale", () => {
  it("prefers an explicit locale cookie over the browser's Accept-Language header", async () => {
    cookies.mockResolvedValue(cookieStore("fr"));
    headers.mockResolvedValue(headerStore("en"));

    const { getRequestLocale } = await import("./request-locale");
    await expect(getRequestLocale()).resolves.toBe("fr");
  });

  it("falls back to the Accept-Language header when no cookie is set", async () => {
    cookies.mockResolvedValue(cookieStore(undefined));
    headers.mockResolvedValue(headerStore("es-ES,es;q=0.9,en;q=0.5"));

    const { getRequestLocale } = await import("./request-locale");
    await expect(getRequestLocale()).resolves.toBe("es");
  });

  it("falls back to the default locale when neither the cookie nor the header match a supported locale", async () => {
    cookies.mockResolvedValue(cookieStore(undefined));
    headers.mockResolvedValue(headerStore("de-DE"));

    const { getRequestLocale } = await import("./request-locale");
    await expect(getRequestLocale()).resolves.toBe("en");
  });

  it("ignores an invalid cookie value and falls back to the header", async () => {
    cookies.mockResolvedValue(cookieStore("xx"));
    headers.mockResolvedValue(headerStore("pt-BR"));

    const { getRequestLocale } = await import("./request-locale");
    await expect(getRequestLocale()).resolves.toBe("pt");
  });
});
