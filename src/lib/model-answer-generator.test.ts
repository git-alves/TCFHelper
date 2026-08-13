import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  geminiMock,
  GeminiRateLimitedErrorMock,
  GeminiNotConfiguredErrorMock,
} = vi.hoisted(() => {
  class GeminiRateLimitedErrorMock extends Error {}
  class GeminiNotConfiguredErrorMock extends Error {}
  return {
    geminiMock: vi.fn(),
    GeminiRateLimitedErrorMock,
    GeminiNotConfiguredErrorMock,
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

import { GeminiRequestError } from "@/lib/gemini";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import {
  generatePreferredModelAnswer,
  hasConfiguredModelAnswerProvider,
  ModelAnswerInvalidOutputError,
  ModelAnswerNotConfiguredError,
  ModelAnswerRateLimitedError,
} from "./model-answer-generator";

const validAnswer = Array.from({ length: 120 }, (_, index) => `mot${index}`).join(" ");
const params = {
  task: TASK_INSTRUCTIONS.TASK_2,
  taskType: "TASK_2" as const,
  level: "B2" as const,
  topicPrompt: "Sujet",
};
const originalApiKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  geminiMock.mockReset();
  geminiMock.mockResolvedValue(validAnswer);
  process.env.GEMINI_API_KEY = "test-key";
});

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
});

describe("generatePreferredModelAnswer", () => {
  it("uses Gemini and records Gemini as the sole provider", async () => {
    await expect(generatePreferredModelAnswer(params)).resolves.toEqual({ text: validAnswer, provider: "gemini" });
    expect(geminiMock).toHaveBeenCalledTimes(1);
  });

  it("reports whether the required Gemini credential is configured", () => {
    expect(hasConfiguredModelAnswerProvider()).toBe(true);
    delete process.env.GEMINI_API_KEY;
    expect(hasConfiguredModelAnswerProvider()).toBe(false);
  });

  it("maps a missing Gemini configuration to the stable unavailable error", async () => {
    geminiMock.mockRejectedValue(new GeminiNotConfiguredErrorMock("missing"));

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(ModelAnswerNotConfiguredError);
  });

  it("maps Gemini rate limiting to the stable retryable error", async () => {
    geminiMock.mockRejectedValue(new GeminiRateLimitedErrorMock("limited"));

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(ModelAnswerRateLimitedError);
  });

  it("keeps an ordinary Gemini request failure distinct", async () => {
    geminiMock.mockRejectedValue(new GeminiRequestError(400));

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(GeminiRequestError);
  });

  it("accepts an answer moderately outside the exact target range", async () => {
    // TASK_2 targets 120-150 words; a 100-word answer stays within the
    // deliberately tolerated 96-180 band.
    const closeEnoughAnswer = Array.from({ length: 100 }, (_, index) => `mot${index}`).join(" ");
    geminiMock.mockResolvedValue(closeEnoughAnswer);

    await expect(generatePreferredModelAnswer(params)).resolves.toEqual({
      text: closeEnoughAnswer,
      provider: "gemini",
    });
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

  it("rejects unusable Gemini output instead of filling the editor", async () => {
    geminiMock.mockResolvedValue("trop court");

    await expect(generatePreferredModelAnswer(params)).rejects.toBeInstanceOf(ModelAnswerInvalidOutputError);
  });
});
