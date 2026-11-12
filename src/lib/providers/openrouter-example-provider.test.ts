import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ExampleProviderNotConfiguredError,
  ExampleProviderRateLimitedError,
  ExampleProviderRequestError,
  ExampleProviderTransportError,
} from "@/lib/example-provider";
import { openRouterExampleProvider } from "./openrouter-example-provider";

const originalFetch = global.fetch;
const originalApiKey = process.env.OPENROUTER_API_KEY;
const originalModel = process.env.OPENROUTER_EXAMPLE_MODEL;

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key";
  delete process.env.OPENROUTER_EXAMPLE_MODEL;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalApiKey;
  if (originalModel === undefined) delete process.env.OPENROUTER_EXAMPLE_MODEL;
  else process.env.OPENROUTER_EXAMPLE_MODEL = originalModel;
});

const params = {
  task: { label: "Tâche 2", title: "Essai", description: "Décrivez.", minWords: 120, maxWords: 150 } as never,
  taskType: "TASK_2" as const,
  level: "B2" as const,
  topicPrompt: "Le télétravail est-il bénéfique ?",
};

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response as Response);
}

describe("openRouterExampleProvider.hasConfiguredCredentials", () => {
  it("requires both an API key and a model", () => {
    expect(openRouterExampleProvider.hasConfiguredCredentials({ apiKey: "k", model: "m" })).toBe(true);
    expect(openRouterExampleProvider.hasConfiguredCredentials({ apiKey: "k", model: null })).toBe(false);
    delete process.env.OPENROUTER_API_KEY;
    expect(openRouterExampleProvider.hasConfiguredCredentials({ apiKey: null, model: "m" })).toBe(false);
  });

  it("falls back to OPENROUTER_EXAMPLE_MODEL when no override model is given", () => {
    process.env.OPENROUTER_EXAMPLE_MODEL = "qwen/qwen3-30b-a3b";
    expect(openRouterExampleProvider.hasConfiguredCredentials()).toBe(true);
  });
});

describe("openRouterExampleProvider.generateExample", () => {
  it("still treats an empty completion as a request failure, even when it stopped at the token limit", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ finish_reason: "length", message: { content: "" } }] }),
    });

    await expect(
      openRouterExampleProvider.generateExample(params, { apiKey: "k", model: "m" }),
    ).rejects.toMatchObject({ status: 200 });
  });

  it("throws ExampleProviderNotConfiguredError without a model", async () => {
    await expect(
      openRouterExampleProvider.generateExample(params, { apiKey: "k", model: null }),
    ).rejects.toBeInstanceOf(ExampleProviderNotConfiguredError);
  });

  it("sends a single user message built from buildExamplePrompt, no system role or response_format", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Un exemple généré." } }] }),
    });

    await openRouterExampleProvider.generateExample(params, { apiKey: "k", model: "openai/gpt-5-mini" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer k");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("openai/gpt-5-mini");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    // The correction budget change must not leak into the example generator.
    expect(body.max_tokens).toBe(2048);
    // require_parameters is for the structured correction call only.
    expect(body).not.toHaveProperty("provider");
    expect(body).not.toHaveProperty("response_format");
    expect(body.messages[0].content).toContain("Le télétravail est-il bénéfique ?");
    expect(body.response_format).toBeUndefined();
  });

  it("returns the raw text content, unparsed", async () => {
    mockFetchOnce({
      status: 200,
      ok: true,
      json: async () => ({ choices: [{ message: { content: "  Un exemple généré.  " } }] }),
    });

    await expect(
      openRouterExampleProvider.generateExample(params, { apiKey: "k", model: "m" }),
    ).resolves.toBe("Un exemple généré.");
  });

  it("throws ExampleProviderRateLimitedError on 429", async () => {
    mockFetchOnce({ status: 429, ok: false });

    await expect(
      openRouterExampleProvider.generateExample(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(ExampleProviderRateLimitedError);
  });

  it("throws ExampleProviderRequestError with the status on a non-2xx response", async () => {
    mockFetchOnce({ status: 401, ok: false });

    const error = await openRouterExampleProvider
      .generateExample(params, { apiKey: "k", model: "m" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ExampleProviderRequestError);
    expect((error as InstanceType<typeof ExampleProviderRequestError>).status).toBe(401);
  });

  it("throws ExampleProviderTransportError when fetch itself rejects", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));

    await expect(
      openRouterExampleProvider.generateExample(params, { apiKey: "k", model: "m" }),
    ).rejects.toBeInstanceOf(ExampleProviderTransportError);
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
        json: async () => ({ choices: [{ message: { content: "Un exemple généré." } }] }),
      } as Response);
    global.fetch = fetchMock;

    const promise = openRouterExampleProvider.generateExample(params, { apiKey: "k", model: "m" });
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await expect(promise).resolves.toBe("Un exemple généré.");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(consoleError).toHaveBeenCalledWith(
      "OpenRouter example generation overloaded (503), retrying (attempt 2) in 5000ms",
    );
  });

  it("gives up after three attempts on a persistent 503", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({ status: 503, ok: false } as Response);
    global.fetch = fetchMock;

    const outcome = openRouterExampleProvider
      .generateExample(params, { apiKey: "k", model: "m" })
      .catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(7_000);

    expect(await outcome).toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe("openRouterExampleProvider.resolveModel", () => {
  it("prefers an explicit override over the env var", () => {
    process.env.OPENROUTER_EXAMPLE_MODEL = "qwen/qwen3-30b-a3b";
    expect(openRouterExampleProvider.resolveModel({ model: "openai/gpt-5-mini" })).toBe("openai/gpt-5-mini");
  });

  it("falls back to OPENROUTER_EXAMPLE_MODEL when no override is given", () => {
    process.env.OPENROUTER_EXAMPLE_MODEL = "qwen/qwen3-30b-a3b";
    expect(openRouterExampleProvider.resolveModel()).toBe("qwen/qwen3-30b-a3b");
  });

  it("returns null when nothing is configured -- unlike Gemini, there is no built-in default", () => {
    expect(openRouterExampleProvider.resolveModel()).toBeNull();
  });
});
