import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import { GeminiNotConfiguredError, GeminiRateLimitedError, generateModelAnswer } from "./gemini";

const originalFetch = global.fetch;
const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GEMINI_MODEL;
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
});

const params = {
  task: TASK_INSTRUCTIONS.TASK_2,
  level: "C1" as const,
  topicPrompt: "Le télétravail est-il bénéfique ?",
};

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response as Response);
}

describe("generateModelAnswer", () => {
  it("fails closed when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(generateModelAnswer(params)).rejects.toBeInstanceOf(GeminiNotConfiguredError);
  });

  it("returns the generated French text on success", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "  Le télétravail présente des avantages.  " }] } }],
      }),
    });

    await expect(generateModelAnswer(params)).resolves.toBe("Le télétravail présente des avantages.");
  });

  it("uses the default model unless GEMINI_MODEL overrides it", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Réponse." }] } }] }),
    });

    await generateModelAnswer(params);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/models/gemini-3.5-flash:generateContent"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-goog-api-key": "test-key" }),
        body: expect.stringContaining('"maxOutputTokens":512'),
      }),
    );
  });

  it("throws GeminiRateLimitedError on a 429 response", async () => {
    mockFetchOnce({ ok: false, status: 429, json: async () => ({}) });

    await expect(generateModelAnswer(params)).rejects.toBeInstanceOf(GeminiRateLimitedError);
  });

  it("throws on a non-OK, non-429 response", async () => {
    mockFetchOnce({ ok: false, status: 500, json: async () => ({ error: { message: "boom" } }) });

    await expect(generateModelAnswer(params)).rejects.toThrow(/Gemini request failed \(500\)/);
  });

  it("throws when the response contains no usable text", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ candidates: [] }) });

    await expect(generateModelAnswer(params)).rejects.toThrow(/no text/);
  });
});
