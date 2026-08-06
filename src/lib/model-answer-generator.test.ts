import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  geminiMock,
  cloudflareMock,
  GeminiRateLimitedErrorMock,
  GeminiNotConfiguredErrorMock,
  CloudflareNotConfiguredErrorMock,
  CloudflareRateLimitedErrorMock,
} = vi.hoisted(() => {
  class GeminiRateLimitedErrorMock extends Error {}
  class GeminiNotConfiguredErrorMock extends Error {}
  class CloudflareNotConfiguredErrorMock extends Error {}
  class CloudflareRateLimitedErrorMock extends Error {}
  return {
    geminiMock: vi.fn(),
    cloudflareMock: vi.fn(),
    GeminiRateLimitedErrorMock,
    GeminiNotConfiguredErrorMock,
    CloudflareNotConfiguredErrorMock,
    CloudflareRateLimitedErrorMock,
  };
});

vi.mock("@/lib/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gemini")>();
  return {
    ...actual,
    generateModelAnswer: geminiMock,
    GeminiRateLimitedError: GeminiRateLimitedErrorMock,
    GeminiNotConfiguredError: GeminiNotConfiguredErrorMock,
  };
});
vi.mock("@/lib/cloudflare-ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cloudflare-ai")>();
  return {
    ...actual,
    generateModelAnswerWithCloudflare: cloudflareMock,
    CloudflareNotConfiguredError: CloudflareNotConfiguredErrorMock,
    CloudflareRateLimitedError: CloudflareRateLimitedErrorMock,
  };
});

import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import { GeminiRequestError } from "@/lib/gemini";
import { CloudflareRequestError } from "@/lib/cloudflare-ai";
import {
  ModelAnswerBothProvidersFailedError,
  ModelAnswerInvalidOutputError,
  ModelAnswerRateLimitedError,
  generatePreferredModelAnswer,
} from "./model-answer-generator";

const validAnswer = Array.from({ length: 120 }, (_, index) => `mot${index}`).join(" ");
const params = { task: TASK_INSTRUCTIONS.TASK_2, level: "B2" as const, topicPrompt: "Sujet" };

beforeEach(() => {
  geminiMock.mockReset();
  cloudflareMock.mockReset();
  geminiMock.mockResolvedValue(validAnswer);
});

afterEach(() => vi.restoreAllMocks());

describe("generatePreferredModelAnswer", () => {
  it("uses Gemini first", async () => {
    await expect(generatePreferredModelAnswer(params)).resolves.toEqual({ text: validAnswer, provider: "gemini" });
    expect(cloudflareMock).not.toHaveBeenCalled();
  });

  it("uses Cloudflare only when Gemini is rate limited", async () => {
    geminiMock.mockRejectedValue(new GeminiRateLimitedErrorMock("limited"));
    cloudflareMock.mockResolvedValue(validAnswer);

    await expect(generatePreferredModelAnswer(params)).resolves.toEqual({ text: validAnswer, provider: "cloudflare" });
  });

  it("uses Cloudflare when Gemini is not configured", async () => {
    geminiMock.mockRejectedValue(new GeminiNotConfiguredErrorMock("missing"));
    cloudflareMock.mockResolvedValue(validAnswer);

    await expect(generatePreferredModelAnswer(params)).resolves.toEqual({ text: validAnswer, provider: "cloudflare" });
  });

  it("does not call Cloudflare for an ordinary Gemini request failure", async () => {
    // Product decision: Cloudflare only covers Gemini's rate limit, a
    // missing Gemini setup, or an out-of-range answer. An ordinary request
    // failure (bad request, auth rejection, upstream outage) must not spend
    // Cloudflare's quota or send the learner's prompt to a second provider.
    geminiMock.mockRejectedValue(new GeminiRequestError(400));

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(GeminiRequestError);
    expect(cloudflareMock).not.toHaveBeenCalled();
  });

  it("returns a limit error when Gemini is rate limited and Cloudflare is unavailable", async () => {
    geminiMock.mockRejectedValue(new GeminiRateLimitedErrorMock("limited"));
    cloudflareMock.mockRejectedValue(new CloudflareNotConfiguredErrorMock("missing"));

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(ModelAnswerRateLimitedError);
  });

  it("accepts an answer moderately outside the exact target range", async () => {
    // TASK_2 targets 120-150 words; free-tier models routinely miss the
    // exact target even when instructed, so a 100-word answer (within the
    // tolerated 96-180 band) must not be rejected.
    const closeEnoughAnswer = Array.from({ length: 100 }, (_, index) => `mot${index}`).join(" ");
    geminiMock.mockResolvedValue(closeEnoughAnswer);

    await expect(generatePreferredModelAnswer(params)).resolves.toEqual({
      text: closeEnoughAnswer,
      provider: "gemini",
    });
    expect(cloudflareMock).not.toHaveBeenCalled();
  });

  it("falls back to Cloudflare when Gemini's answer length is unusable", async () => {
    geminiMock.mockResolvedValue("trop court");
    cloudflareMock.mockResolvedValue(validAnswer);

    await expect(generatePreferredModelAnswer(params)).resolves.toEqual({
      text: validAnswer,
      provider: "cloudflare",
    });
  });

  it("returns a rate-limit result when Cloudflare is limited after invalid Gemini output", async () => {
    geminiMock.mockResolvedValue("trop court");
    cloudflareMock.mockRejectedValue(new CloudflareRateLimitedErrorMock("limited"));

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(ModelAnswerRateLimitedError);
  });

  it("keeps non-round task tolerance within 20 percent at both boundaries", async () => {
    const nonRoundParams = {
      ...params,
      task: { ...params.task, minWords: 101, maxWords: 149 },
    };
    const atMinimum = Array.from({ length: 81 }, (_, index) => `mot${index}`).join(" ");
    const atMaximum = Array.from({ length: 178 }, (_, index) => `mot${index}`).join(" ");
    geminiMock.mockResolvedValueOnce(atMinimum).mockResolvedValueOnce(atMaximum);

    await expect(generatePreferredModelAnswer(nonRoundParams)).resolves.toEqual({ text: atMinimum, provider: "gemini" });
    await expect(generatePreferredModelAnswer(nonRoundParams)).resolves.toEqual({ text: atMaximum, provider: "gemini" });
  });

  it("rejects word counts just outside the inward-rounded tolerance", async () => {
    const nonRoundParams = {
      ...params,
      task: { ...params.task, minWords: 101, maxWords: 149 },
    };
    const belowMinimum = Array.from({ length: 80 }, (_, index) => `mot${index}`).join(" ");
    geminiMock.mockResolvedValue(belowMinimum);
    cloudflareMock.mockResolvedValue(validAnswer);

    await expect(generatePreferredModelAnswer(nonRoundParams)).resolves.toEqual({ text: validAnswer, provider: "cloudflare" });
  });

  it("rejects out-of-range provider output from both providers instead of filling the editor", async () => {
    geminiMock.mockResolvedValue("trop court");
    cloudflareMock.mockResolvedValue("aussi trop court");

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(ModelAnswerInvalidOutputError);
    expect(cloudflareMock).toHaveBeenCalled();
  });

  it("wraps a generic Cloudflare failure with why Gemini was skipped, so a caller can log both", async () => {
    geminiMock.mockRejectedValue(new GeminiRateLimitedErrorMock("limited"));
    const cloudflareError = new CloudflareRequestError(401);
    cloudflareMock.mockRejectedValue(cloudflareError);

    const error: unknown = await generatePreferredModelAnswer(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ModelAnswerBothProvidersFailedError);
    expect((error as ModelAnswerBothProvidersFailedError).geminiReason).toBe("rateLimited");
    expect((error as ModelAnswerBothProvidersFailedError).cloudflareError).toBe(cloudflareError);
  });

  it("wraps a generic Cloudflare failure with 'notConfigured' when Gemini itself was never set up", async () => {
    geminiMock.mockRejectedValue(new GeminiNotConfiguredErrorMock("missing"));
    cloudflareMock.mockRejectedValue(new CloudflareRequestError(500));

    const error: unknown = await generatePreferredModelAnswer(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ModelAnswerBothProvidersFailedError);
    expect((error as ModelAnswerBothProvidersFailedError).geminiReason).toBe("notConfigured");
  });

  it("wraps a generic Cloudflare failure with 'invalidOutput' when Gemini's own answer was unusable", async () => {
    geminiMock.mockResolvedValue("trop court");
    cloudflareMock.mockRejectedValue(new CloudflareRequestError(403));

    const error: unknown = await generatePreferredModelAnswer(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ModelAnswerBothProvidersFailedError);
    expect((error as ModelAnswerBothProvidersFailedError).geminiReason).toBe("invalidOutput");
  });

  it("never carries upstream error text on the wrapper itself, only the fixed reason and the original error object", async () => {
    const sentinel = "SENTINEL_UPSTREAM_TEXT_MUST_NOT_LEAK";
    geminiMock.mockRejectedValue(new GeminiRateLimitedErrorMock(sentinel));
    cloudflareMock.mockRejectedValue(new Error(sentinel));

    const error: unknown = await generatePreferredModelAnswer(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ModelAnswerBothProvidersFailedError);
    expect((error as Error).message).not.toContain(sentinel);
  });
});
