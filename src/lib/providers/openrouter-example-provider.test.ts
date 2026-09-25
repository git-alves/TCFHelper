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

  it("retries once on a 503 before succeeding", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 503, ok: false } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ choices: [{ message: { content: "Un exemple généré." } }] }),
      } as Response);
    global.fetch = fetchMock;

    await expect(
      openRouterExampleProvider.generateExample(params, { apiKey: "k", model: "m" }),
    ).resolves.toBe("Un exemple généré.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
