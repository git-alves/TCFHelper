import { describe, expect, it } from "vitest";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import {
  ExampleProviderNotConfiguredError,
  ExampleProviderRateLimitedError,
  ExampleProviderRequestError,
  type ExampleProvider,
} from "@/lib/example-provider";
import {
  generatePreferredModelAnswer,
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

function stubProvider(
  generateExample: (...args: Parameters<ExampleProvider["generateExample"]>) => ReturnType<ExampleProvider["generateExample"]>,
): ExampleProvider {
  return {
    id: "gemini",
    hasConfiguredCredentials: () => true,
    generateExample,
  };
}

describe("generatePreferredModelAnswer", () => {
  it("uses the given provider and records its id", async () => {
    const provider = stubProvider(async () => validAnswer);

    await expect(generatePreferredModelAnswer(provider, params)).resolves.toEqual({
      text: validAnswer,
      provider: "gemini",
    });
  });

  it("reports the resolved provider's own id, not a hardcoded one", async () => {
    const provider: ExampleProvider = {
      id: "openrouter",
      hasConfiguredCredentials: () => true,
      generateExample: async () => validAnswer,
    };

    await expect(generatePreferredModelAnswer(provider, params)).resolves.toEqual({
      text: validAnswer,
      provider: "openrouter",
    });
  });

  it("maps a missing provider configuration to the stable unavailable error", async () => {
    const provider = stubProvider(async () => {
      throw new ExampleProviderNotConfiguredError("missing");
    });

    await expect(generatePreferredModelAnswer(provider, params)).rejects.toBeInstanceOf(
      ModelAnswerNotConfiguredError,
    );
  });

  it("maps provider rate limiting to the stable retryable error", async () => {
    const provider = stubProvider(async () => {
      throw new ExampleProviderRateLimitedError("limited");
    });

    await expect(generatePreferredModelAnswer(provider, params)).rejects.toBeInstanceOf(
      ModelAnswerRateLimitedError,
    );
  });

  it("keeps an ordinary provider request failure distinct", async () => {
    const provider = stubProvider(async () => {
      throw new ExampleProviderRequestError(400);
    });

    await expect(generatePreferredModelAnswer(provider, params)).rejects.toBeInstanceOf(
      ExampleProviderRequestError,
    );
  });

  it("accepts an answer moderately outside the exact target range", async () => {
    // TASK_2 targets 120-150 words; a 100-word answer stays within the
    // deliberately tolerated 96-180 band.
    const closeEnoughAnswer = Array.from({ length: 100 }, (_, index) => `mot${index}`).join(" ");
    const provider = stubProvider(async () => closeEnoughAnswer);

    await expect(generatePreferredModelAnswer(provider, params)).resolves.toEqual({
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

    await expect(
      generatePreferredModelAnswer(stubProvider(async () => atMinimum), nonRoundParams),
    ).resolves.toEqual({ text: atMinimum, provider: "gemini" });
    await expect(
      generatePreferredModelAnswer(stubProvider(async () => atMaximum), nonRoundParams),
    ).resolves.toEqual({ text: atMaximum, provider: "gemini" });
  });

  it("rejects unusable provider output instead of filling the editor", async () => {
    const provider = stubProvider(async () => "trop court");

    await expect(generatePreferredModelAnswer(provider, params)).rejects.toBeInstanceOf(
      ModelAnswerInvalidOutputError,
    );
  });
});
