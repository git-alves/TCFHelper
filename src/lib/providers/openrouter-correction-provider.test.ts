import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CorrectionProviderNotConfiguredError,
  CorrectionProviderParseError,
  CorrectionProviderRateLimitedError,
  CorrectionProviderRequestError,
  CorrectionProviderTransportError,
} from "@/lib/correction-provider";
import { openRouterCorrectionProvider } from "./openrouter-correction-provider";

const originalFetch = global.fetch;
const originalApiKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.OPENROUTER_CORRECTION_MODEL;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  delete process.env.OPENROUTER_CORRECTION_MODEL;
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalApiKey;
  if (originalModel === undefined) delete process.env.OPENROUTER_CORRECTION_MODEL;
  else process.env.OPENROUTER_CORRECTION_MODEL = originalModel;
});

const params = { systemPrompt: "Grade this.", userPrompt: "Bonjour." };

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response as Response);
}

describe("openRouterCorrectionProvider.hasConfiguredCredentials", () => {
  it("requires both an API key and a model", () => {
    expect(openRouterCorrectionProvider.hasConfiguredCredentials({ apiKey: "k", model: "m" })).toBe(true);
    expect(openRouterCorrectionProvider.hasConfiguredCredentials({ apiKey: "k", model: null })).toBe(false);
    delete process.env.OPENROUTER_API_KEY;
    expect(openRouterCorrectionProvider.hasConfiguredCredentials({ apiKey: null, model: "m" })).toBe(false);
  });

  it("falls back to OPENROUTER_CORRECTION_MODEL when no override model is given", () => {
    process.env.OPENROUTER_CORRECTION_MODEL = "qwen/qwen3-30b-a3b";
    expect(openRouterCorrectionProvider.hasConfiguredCredentials()).toBe(true);
  });
});

describe("openRouterCorrectionProvider.gradeEssay", () => {
  it("throws CorrectionProviderNotConfiguredError without a model", async () => {
    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: null }),
    ).rejects.toBeInstanceOf(CorrectionProviderNotConfiguredError);
  });

  it("sends the messages, model, and a JSON-schema response format", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"correctedText":"ok"}' } }] }),
    });

    await openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "openai/gpt-5-mini" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer k");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("openai/gpt-5-mini");
    expect(body.messages).toEqual([
      { role: "system", content: params.systemPrompt },
      { role: "user", content: params.userPrompt },
    ]);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.schema.properties).toHaveProperty("cefr");
  });

  it("parses the chat-completion content as the raw feedback JSON", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"correctedText":"Bonjour."}' } }] }),
    });

    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).resolves.toEqual({ correctedText: "Bonjour." });
  });

  it("throws CorrectionProviderParseError when the content isn't valid JSON", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: "not json" } }] }),
    });

    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(CorrectionProviderParseError);
  });

  it("throws CorrectionProviderRateLimitedError on 429", async () => {
    mockFetchOnce({ status: 429, ok: false });

    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(CorrectionProviderRateLimitedError);
  });

  it("throws CorrectionProviderRequestError with the status on a non-2xx response", async () => {
    mockFetchOnce({ status: 401, ok: false });

    const error = await openRouterCorrectionProvider
      .gradeEssay(params, { apiKey: "k", model: "m" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CorrectionProviderRequestError);
    expect((error as InstanceType<typeof CorrectionProviderRequestError>).status).toBe(401);
  });

  it("throws CorrectionProviderRequestError for a 2xx response carrying an embedded error object", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ error: { code: 400, message: "model rejected the request" } }),
    });

    const error = await openRouterCorrectionProvider
      .gradeEssay(params, { apiKey: "k", model: "m" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CorrectionProviderRequestError);
    expect((error as InstanceType<typeof CorrectionProviderRequestError>).status).toBe(400);
  });

  it("throws CorrectionProviderTransportError when fetch itself rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(CorrectionProviderTransportError);
  });

  it("retries once on a 503 before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 503, ok: false } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"correctedText":"ok"}' } }] }),
      } as Response);
    global.fetch = fetchMock;

    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).resolves.toEqual({ correctedText: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
