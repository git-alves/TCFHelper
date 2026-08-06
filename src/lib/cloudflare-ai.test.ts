import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import {
  CloudflareNotConfiguredError,
  CloudflareRateLimitedError,
  CloudflareRequestError,
  CloudflareTransportError,
  generateModelAnswerWithCloudflare,
} from "./cloudflare-ai";

const originalFetch = global.fetch;
const originalAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const originalToken = process.env.CLOUDFLARE_AI_API_TOKEN;

beforeEach(() => {
  process.env.CLOUDFLARE_ACCOUNT_ID = "account_1";
  process.env.CLOUDFLARE_AI_API_TOKEN = "token_1";
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalAccountId === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
  else process.env.CLOUDFLARE_ACCOUNT_ID = originalAccountId;
  if (originalToken === undefined) delete process.env.CLOUDFLARE_AI_API_TOKEN;
  else process.env.CLOUDFLARE_AI_API_TOKEN = originalToken;
});

const params = { task: TASK_INSTRUCTIONS.TASK_2, level: "C1" as const, topicPrompt: "Le télétravail est-il bénéfique ?" };

describe("generateModelAnswerWithCloudflare", () => {
  it("uses the documented chat-completion response shape", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { choices: [{ message: { content: "  Réponse Cloudflare.  " } }] } }),
    } as Response);

    await expect(generateModelAnswerWithCloudflare(params)).resolves.toBe("Réponse Cloudflare.");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/ai/run/@cf/zai-org/glm-4.7-flash"),
      expect.objectContaining({ body: expect.stringContaining('"max_completion_tokens":512') }),
    );
  });

  it("accepts the direct endpoint's simple response field", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { response: "Réponse simple." } }),
    } as Response);

    await expect(generateModelAnswerWithCloudflare(params)).resolves.toBe("Réponse simple.");
  });

  it("fails closed without both Cloudflare credentials", async () => {
    delete process.env.CLOUDFLARE_AI_API_TOKEN;

    await expect(generateModelAnswerWithCloudflare(params)).rejects.toBeInstanceOf(CloudflareNotConfiguredError);
  });

  it("classifies a Workers AI limit response", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) } as Response);

    await expect(generateModelAnswerWithCloudflare(params)).rejects.toBeInstanceOf(CloudflareRateLimitedError);
  });

  it("throws CloudflareTransportError, distinct from a status-based failure, when fetch itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(generateModelAnswerWithCloudflare(params)).rejects.toBeInstanceOf(CloudflareTransportError);
  });

  it("throws CloudflareRequestError, not CloudflareTransportError, when a 200 response body is malformed JSON", async () => {
    const json = async (): Promise<unknown> => {
      throw new SyntaxError("Unexpected end of JSON input");
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json } as Response);

    const error: unknown = await generateModelAnswerWithCloudflare(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CloudflareRequestError);
    expect((error as CloudflareRequestError).status).toBe(200);
  });

  it("throws CloudflareTransportError, not CloudflareRequestError, when the response body stream fails to read after a 200 status", async () => {
    const json = async (): Promise<unknown> => {
      throw new TypeError("terminated");
    };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json } as Response);

    await expect(generateModelAnswerWithCloudflare(params)).rejects.toBeInstanceOf(CloudflareTransportError);
  });

  it("never calls response.json() on a non-OK response", async () => {
    const jsonMock = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, json: jsonMock } as unknown as Response);

    await generateModelAnswerWithCloudflare(params).catch(() => {});

    expect(jsonMock).not.toHaveBeenCalled();
  });
});
