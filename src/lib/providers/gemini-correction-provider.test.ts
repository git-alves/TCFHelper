import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { gradeEssayWithGeminiMock, hasConfiguredGeminiMock } = vi.hoisted(() => ({
  gradeEssayWithGeminiMock: vi.fn(),
  hasConfiguredGeminiMock: vi.fn(),
}));

vi.mock("@/lib/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gemini")>("@/lib/gemini");
  return {
    ...actual,
    gradeEssayWithGemini: gradeEssayWithGeminiMock,
    hasConfiguredGemini: hasConfiguredGeminiMock,
  };
});

const {
  GeminiCorrectionParseError,
  GeminiNotConfiguredError,
  GeminiRateLimitedError,
  GeminiRequestError,
  GeminiTransportError,
} = await import("@/lib/gemini");
const {
  CorrectionProviderInvalidJsonError,
  CorrectionProviderNotConfiguredError,
  CorrectionProviderRateLimitedError,
  CorrectionProviderRequestError,
  CorrectionProviderTransportError,
} = await import("@/lib/correction-provider");
const { geminiCorrectionProvider } = await import("./gemini-correction-provider");

const originalCorrectionModel = process.env.GEMINI_CORRECTION_MODEL;

beforeEach(() => {
  gradeEssayWithGeminiMock.mockReset();
  hasConfiguredGeminiMock.mockReset();
  delete process.env.GEMINI_CORRECTION_MODEL;
});

afterEach(() => {
  if (originalCorrectionModel === undefined) delete process.env.GEMINI_CORRECTION_MODEL;
  else process.env.GEMINI_CORRECTION_MODEL = originalCorrectionModel;
});

describe("geminiCorrectionProvider", () => {
  it("has the gemini id", () => {
    expect(geminiCorrectionProvider.id).toBe("gemini");
  });

  it("delegates credential checks to hasConfiguredGemini", () => {
    hasConfiguredGeminiMock.mockReturnValue(true);
    expect(geminiCorrectionProvider.hasConfiguredCredentials({ apiKey: "k", model: null })).toBe(true);
    expect(hasConfiguredGeminiMock).toHaveBeenCalledWith({ apiKey: "k", model: null });
  });

  it("returns the raw grading result on success", async () => {
    gradeEssayWithGeminiMock.mockResolvedValue({ correctedText: "ok" });

    await expect(
      geminiCorrectionProvider.gradeEssay({ systemPrompt: "s", userPrompt: "u" }),
    ).resolves.toEqual({ correctedText: "ok" });
    expect(gradeEssayWithGeminiMock).toHaveBeenCalledWith({ systemPrompt: "s", userPrompt: "u" }, undefined);
  });

  it.each([
    [new GeminiNotConfiguredError("x"), CorrectionProviderNotConfiguredError],
    [new GeminiRateLimitedError("x"), CorrectionProviderRateLimitedError],
    // Always the more specific invalid-JSON classification, never
    // format-unsupported: Gemini's own responseSchema/responseMimeType
    // enforcement means an unparseable body is a malformed/truncated JSON
    // attempt, not a "didn't try" case (see gemini-correction-provider.ts).
    [new GeminiCorrectionParseError(), CorrectionProviderInvalidJsonError],
    [new GeminiTransportError(), CorrectionProviderTransportError],
  ])("translates %s into the provider-agnostic error type", async (thrown, expectedType) => {
    gradeEssayWithGeminiMock.mockRejectedValue(thrown);

    await expect(
      geminiCorrectionProvider.gradeEssay({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toBeInstanceOf(expectedType);
  });

  it("preserves the HTTP status on a GeminiRequestError", async () => {
    gradeEssayWithGeminiMock.mockRejectedValue(new GeminiRequestError(503));

    const error = await geminiCorrectionProvider
      .gradeEssay({ systemPrompt: "s", userPrompt: "u" })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CorrectionProviderRequestError);
    expect((error as InstanceType<typeof CorrectionProviderRequestError>).status).toBe(503);
  });

  it("rethrows an unrecognized error as-is", async () => {
    const unknownError = new Error("unexpected");
    gradeEssayWithGeminiMock.mockRejectedValue(unknownError);

    await expect(
      geminiCorrectionProvider.gradeEssay({ systemPrompt: "s", userPrompt: "u" }),
    ).rejects.toBe(unknownError);
  });

  describe("resolveModel", () => {
    it("prefers an explicit override over the env var and the built-in default", () => {
      process.env.GEMINI_CORRECTION_MODEL = "gemini-env-model";
      expect(geminiCorrectionProvider.resolveModel({ model: "gemini-override-model" })).toBe(
        "gemini-override-model",
      );
    });

    it("falls back to GEMINI_CORRECTION_MODEL when no override is given", () => {
      process.env.GEMINI_CORRECTION_MODEL = "gemini-env-model";
      expect(geminiCorrectionProvider.resolveModel()).toBe("gemini-env-model");
    });

    it("falls back to the built-in default when nothing else is set -- never null, unlike OpenRouter", () => {
      expect(geminiCorrectionProvider.resolveModel()).toBe("gemini-3.5-flash-lite");
    });
  });
});
