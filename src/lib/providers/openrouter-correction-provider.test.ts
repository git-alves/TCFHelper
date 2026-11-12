import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CorrectionProviderFormatUnsupportedError,
  CorrectionProviderInvalidJsonError,
  CorrectionProviderNotConfiguredError,
  CorrectionProviderOutputTruncatedError,
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
  vi.useRealTimers();
  vi.restoreAllMocks();
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

  it("throws CorrectionProviderFormatUnsupportedError when the content doesn't even look like JSON", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Sure, here is my assessment: ..." } }] }),
    });

    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(CorrectionProviderFormatUnsupportedError);
  });

  it("throws CorrectionProviderInvalidJsonError when the content looks like JSON but fails to parse", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"correctedText": "Bonjour.",' } }] }),
    });

    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(CorrectionProviderInvalidJsonError);
  });

  it("asks OpenRouter to route only to endpoints that honour response_format (require_parameters)", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ finish_reason: "stop", message: { content: '{"correctedText":"ok"}' } }] }),
    });

    await openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" });

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body as string).provider).toEqual({ require_parameters: true });
  });

  it("accepts a reply wrapped in a ```json fence, and still refuses prose", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ finish_reason: "stop", message: { content: '```json\n{"correctedText":"ok"}\n```' } }] }),
    });
    await expect(openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" })).resolves.toEqual({
      correctedText: "ok",
    });

    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ finish_reason: "stop", message: { content: "Here is my assessment: it is good." } }] }),
    });
    await expect(openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" })).rejects.toBeInstanceOf(
      CorrectionProviderFormatUnsupportedError,
    );
  });

  it("asks for 8192 completion tokens so a long Tâche 3 correction is not cut off", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ finish_reason: "stop", message: { content: '{"correctedText":"ok"}' } }] }),
    });

    await openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" });

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(init.body as string).max_tokens).toBe(8192);
  });

  it("parses a normal response with finish_reason stop and logs nothing", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({
        choices: [{ finish_reason: "stop", message: { content: '{"correctedText":"Bonjour."}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      }),
    });

    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).resolves.toEqual({ correctedText: "Bonjour." });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  describe("output cut off at the token limit", () => {
    it("throws CorrectionProviderOutputTruncatedError for finish_reason length and logs only the reason and counts", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockFetchOnce({
        status: 200,
        ok: true,
        json: async () => ({
          choices: [{ finish_reason: "length", message: { content: '{"correctedText": "Le télétravail change Marie' } }],
          usage: { prompt_tokens: 3100, completion_tokens: 8192, completion_tokens_details: { reasoning_tokens: 900 } },
        }),
      });

      await expect(
        openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
      ).rejects.toBeInstanceOf(CorrectionProviderOutputTruncatedError);

      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError).toHaveBeenCalledWith(
        "OpenRouter correction output truncated finishReason=length promptTokens=3100 completionTokens=8192 reasoningTokens=900",
      );
      const logged = consoleError.mock.calls.flat().join(" ");
      expect(logged).not.toContain("télétravail");
      expect(logged).not.toContain("Marie");
      consoleError.mockRestore();
    });

    it("throws the same error when length leaves no content at all", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockFetchOnce({
        status: 200,
        ok: true,
        json: async () => ({
          choices: [{ finish_reason: "length", message: { content: "" } }],
          usage: { prompt_tokens: 3100, completion_tokens: 8192 },
        }),
      });

      await expect(
        openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
      ).rejects.toBeInstanceOf(CorrectionProviderOutputTruncatedError);
      expect(consoleError).toHaveBeenCalledWith(
        "OpenRouter correction output truncated (no text) finishReason=length promptTokens=3100 completionTokens=8192 reasoningTokens=unknown",
      );
      consoleError.mockRestore();
    });

    it("also accepts the routed provider's native MAX_TOKENS value", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockFetchOnce({
        status: 200,
        ok: true,
        json: async () => ({
          choices: [{ finish_reason: "stop", native_finish_reason: "MAX_TOKENS", message: { content: '{"correctedText": "x' } }],
        }),
      });

      await expect(
        openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
      ).rejects.toBeInstanceOf(CorrectionProviderOutputTruncatedError);
      consoleError.mockRestore();
    });

    it("keeps bad JSON that finished normally as an invalid-JSON failure", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockFetchOnce({
        status: 200,
        ok: true,
        json: async () => ({
          choices: [{ finish_reason: "stop", message: { content: '{"correctedText": "Bonjour.",' } }],
        }),
      });

      await expect(
        openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
      ).rejects.toBeInstanceOf(CorrectionProviderInvalidJsonError);
      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("keeps empty content that finished normally as a request failure with the HTTP status", async () => {
      mockFetchOnce({
        status: 200,
        ok: true,
        json: async () => ({ choices: [{ finish_reason: "stop", message: { content: "" } }] }),
      });

      const error = await openRouterCorrectionProvider
        .gradeEssay(params, { apiKey: "k", model: "m" })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(CorrectionProviderRequestError);
      expect((error as InstanceType<typeof CorrectionProviderRequestError>).status).toBe(200);
    });
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

  it("retries a 503 with growing waits and succeeds on the third attempt", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 503, ok: false } as Response)
      .mockResolvedValueOnce({ status: 503, ok: false } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"correctedText":"ok"}' } }] }),
      } as Response);
    global.fetch = fetchMock;

    const promise = openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await expect(promise).resolves.toEqual({ correctedText: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledWith("OpenRouter correction overloaded (503), retrying (attempt 1) in 2000ms");
    expect(consoleError).toHaveBeenCalledWith("OpenRouter correction overloaded (503), retrying (attempt 2) in 5000ms");
  });

  it("gives up after three attempts on a persistent 503, as the same 503 request error", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({ status: 503, ok: false } as Response);
    global.fetch = fetchMock;

    const outcome = openRouterCorrectionProvider
      .gradeEssay(params, { apiKey: "k", model: "m" })
      .catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(7_000);

    const error = await outcome;
    expect(error).toBeInstanceOf(CorrectionProviderRequestError);
    expect((error as InstanceType<typeof CorrectionProviderRequestError>).status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a 429 or a 400", async () => {
    const rateLimited = vi.fn().mockResolvedValue({ status: 429, ok: false } as Response);
    global.fetch = rateLimited;
    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(CorrectionProviderRateLimitedError);
    expect(rateLimited).toHaveBeenCalledTimes(1);

    const badRequest = vi.fn().mockResolvedValue({ status: 400, ok: false } as Response);
    global.fetch = badRequest;
    await expect(
      openRouterCorrectionProvider.gradeEssay(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(CorrectionProviderRequestError);
    expect(badRequest).toHaveBeenCalledTimes(1);
  });
});

describe("openRouterCorrectionProvider.resolveModel", () => {
  it("prefers an explicit override over the env var", () => {
    process.env.OPENROUTER_CORRECTION_MODEL = "qwen/qwen3-30b-a3b";
    expect(openRouterCorrectionProvider.resolveModel({ model: "openai/gpt-5-mini" })).toBe("openai/gpt-5-mini");
  });

  it("falls back to OPENROUTER_CORRECTION_MODEL when no override is given", () => {
    process.env.OPENROUTER_CORRECTION_MODEL = "qwen/qwen3-30b-a3b";
    expect(openRouterCorrectionProvider.resolveModel()).toBe("qwen/qwen3-30b-a3b");
  });

  it("returns null when nothing is configured -- unlike Gemini, there is no built-in default", () => {
    expect(openRouterCorrectionProvider.resolveModel()).toBeNull();
  });
});
