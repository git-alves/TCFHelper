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

  it("constrains reasoning effort, so a reasoning model doesn't spend the whole completion budget on hidden reasoning", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { response: "Réponse simple." } }),
    } as Response);

    await generateModelAnswerWithCloudflare(params);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: expect.stringContaining('"reasoning_effort":"low"') }),
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

  it("attaches a safe, structural payload-shape diagnostic when a 200 response has no usable text", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        errors: [],
        result: {
          choices: [{ message: { role: "assistant" }, finish_reason: "length" }],
        },
      }),
    } as Response);

    const error: unknown = await generateModelAnswerWithCloudflare(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CloudflareRequestError);
    const shape = (error as CloudflareRequestError).payloadShape;
    expect(shape).toContain("message_content=missing");
    expect(shape).toContain("finish_reason=length");
  });

  it("distinguishes an empty/whitespace text field from a genuinely missing one", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { choices: [{ message: { content: "   " } }] } }),
    } as Response);

    const error: unknown = await generateModelAnswerWithCloudflare(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CloudflareRequestError);
    expect((error as CloudflareRequestError).payloadShape).toContain("message_content=empty");
  });

  it("never puts the response's own text in the payload-shape diagnostic", async () => {
    const sentinel = "SENTINEL_UPSTREAM_TEXT_MUST_NOT_LEAK";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: { choices: [{ message: { content: 12345 }, finish_reason: sentinel }] },
      }),
    } as Response);

    const error: unknown = await generateModelAnswerWithCloudflare(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CloudflareRequestError);
    // finish_reason is a real string here, so only the whitelist -- not a
    // typeof check -- is what keeps an unrecognized value from passing
    // through verbatim.
    expect((error as CloudflareRequestError).payloadShape).not.toContain(sentinel);
  });

  it("never puts an arbitrary success value in the payload-shape diagnostic", async () => {
    const sentinel = "SENTINEL_UPSTREAM_TEXT_MUST_NOT_LEAK";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: sentinel, result: { choices: [] } }),
    } as Response);

    const error: unknown = await generateModelAnswerWithCloudflare(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CloudflareRequestError);
    const shape = (error as CloudflareRequestError).payloadShape;
    expect(shape).not.toContain(sentinel);
    expect(shape).toContain("success=not_boolean");
  });
});
