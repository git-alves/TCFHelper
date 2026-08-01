import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeepLQuotaExceededError, translateWithDeepL } from "./deepl-translate";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("translateWithDeepL", () => {
  it("posts to the DeepL Free endpoint with the auth-key header and region-qualified target", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ translations: [{ text: "Hello world.", detected_source_language: "FR" }] }),
    );

    const translation = await translateWithDeepL(
      "Bonjour le monde.",
      "en",
      "test-key:fx",
      new AbortController().signal,
    );

    expect(translation).toBe("Hello world.");
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api-free.deepl.com/v2/translate");
    expect(init.headers).toMatchObject({ Authorization: "DeepL-Auth-Key test-key:fx" });
    expect(JSON.parse(init.body as string)).toEqual({
      text: ["Bonjour le monde."],
      source_lang: "FR",
      target_lang: "EN-US",
    });
  });

  it("maps Portuguese and Spanish to DeepL's target codes", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ translations: [{ text: "Olá." }] }),
    );
    await translateWithDeepL("Bonjour.", "pt", "key", new AbortController().signal);
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string).target_lang).toBe(
      "PT-BR",
    );

    fetchMock.mockResolvedValue(jsonResponse({ translations: [{ text: "Hola." }] }));
    await translateWithDeepL("Bonjour.", "es", "key", new AbortController().signal);
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string).target_lang).toBe(
      "ES",
    );
  });

  it("throws DeepLQuotaExceededError on HTTP 456", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Quota exceeded. The character limit has been reached." }, 456),
    );

    await expect(
      translateWithDeepL("Bonjour.", "en", "key", new AbortController().signal),
    ).rejects.toBeInstanceOf(DeepLQuotaExceededError);
  });

  it("throws a generic error on other failures without leaking the request", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "Forbidden." }, 403));

    await expect(
      translateWithDeepL("Bonjour.", "en", "key", new AbortController().signal),
    ).rejects.toMatchObject({ message: expect.stringContaining("403") });
  });

  it("throws when DeepL returns no translated text", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ translations: [] }));

    await expect(
      translateWithDeepL("Bonjour.", "en", "key", new AbortController().signal),
    ).rejects.toThrow(/no translated text/);
  });
});
