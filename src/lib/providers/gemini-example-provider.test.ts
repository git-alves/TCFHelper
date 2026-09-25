import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateModelAnswerMock, hasConfiguredGeminiMock } = vi.hoisted(() => ({
  generateModelAnswerMock: vi.fn(),
  hasConfiguredGeminiMock: vi.fn(),
}));

vi.mock("@/lib/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gemini")>("@/lib/gemini");
  return {
    ...actual,
    generateModelAnswer: generateModelAnswerMock,
    hasConfiguredGemini: hasConfiguredGeminiMock,
  };
});

const {
  GeminiNotConfiguredError,
  GeminiRateLimitedError,
  GeminiRequestError,
  GeminiTransportError,
} = await import("@/lib/gemini");
const {
  ExampleProviderNotConfiguredError,
  ExampleProviderRateLimitedError,
  ExampleProviderRequestError,
  ExampleProviderTransportError,
} = await import("@/lib/example-provider");
const { geminiExampleProvider } = await import("./gemini-example-provider");

const params = {
  task: { minWords: 120, maxWords: 150 } as never,
  taskType: "TASK_2" as const,
  level: "B2" as const,
  topicPrompt: "Sujet",
};

beforeEach(() => {
  generateModelAnswerMock.mockReset();
  hasConfiguredGeminiMock.mockReset();
});

describe("geminiExampleProvider", () => {
  it("has the gemini id", () => {
    expect(geminiExampleProvider.id).toBe("gemini");
  });

  it("delegates credential checks to hasConfiguredGemini", () => {
    hasConfiguredGeminiMock.mockReturnValue(true);
    expect(geminiExampleProvider.hasConfiguredCredentials({ apiKey: "k", model: null })).toBe(true);
    expect(hasConfiguredGeminiMock).toHaveBeenCalledWith({ apiKey: "k", model: null });
  });

  it("returns the raw example text on success", async () => {
    generateModelAnswerMock.mockResolvedValue("Un exemple.");

    await expect(geminiExampleProvider.generateExample(params)).resolves.toBe("Un exemple.");
    expect(generateModelAnswerMock).toHaveBeenCalledWith(params, undefined);
  });

  it.each([
    [new GeminiNotConfiguredError("x"), ExampleProviderNotConfiguredError],
    [new GeminiRateLimitedError("x"), ExampleProviderRateLimitedError],
    [new GeminiTransportError(), ExampleProviderTransportError],
  ])("translates %s into the provider-agnostic error type", async (thrown, expectedType) => {
    generateModelAnswerMock.mockRejectedValue(thrown);

    await expect(geminiExampleProvider.generateExample(params)).rejects.toBeInstanceOf(expectedType);
  });

  it("preserves the HTTP status on a GeminiRequestError", async () => {
    generateModelAnswerMock.mockRejectedValue(new GeminiRequestError(503));

    const error = await geminiExampleProvider.generateExample(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ExampleProviderRequestError);
    expect((error as InstanceType<typeof ExampleProviderRequestError>).status).toBe(503);
  });

  it("rethrows an unrecognized error as-is", async () => {
    const unknownError = new Error("unexpected");
    generateModelAnswerMock.mockRejectedValue(unknownError);

    await expect(geminiExampleProvider.generateExample(params)).rejects.toBe(unknownError);
  });
});
