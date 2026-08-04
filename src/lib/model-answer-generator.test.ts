import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  geminiMock,
  cloudflareMock,
  GeminiRateLimitedErrorMock,
  GeminiNotConfiguredErrorMock,
  CloudflareNotConfiguredErrorMock,
} = vi.hoisted(() => {
  class GeminiRateLimitedErrorMock extends Error {}
  class GeminiNotConfiguredErrorMock extends Error {}
  class CloudflareNotConfiguredErrorMock extends Error {}
  return {
    geminiMock: vi.fn(),
    cloudflareMock: vi.fn(),
    GeminiRateLimitedErrorMock,
    GeminiNotConfiguredErrorMock,
    CloudflareNotConfiguredErrorMock,
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
  };
});

import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import {
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

  it("does not call Cloudflare for a non-limit Gemini failure", async () => {
    geminiMock.mockRejectedValue(new Error("Gemini unavailable"));

    await expect(generatePreferredModelAnswer(params)).rejects.toThrow("Gemini unavailable");
    expect(cloudflareMock).not.toHaveBeenCalled();
  });

  it("returns a limit error when Gemini is rate limited and Cloudflare is unavailable", async () => {
    geminiMock.mockRejectedValue(new GeminiRateLimitedErrorMock("limited"));
    cloudflareMock.mockRejectedValue(new CloudflareNotConfiguredErrorMock("missing"));

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(ModelAnswerRateLimitedError);
  });

  it("rejects out-of-range provider output instead of filling the editor", async () => {
    geminiMock.mockResolvedValue("trop court");

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(ModelAnswerInvalidOutputError);
  });
});
