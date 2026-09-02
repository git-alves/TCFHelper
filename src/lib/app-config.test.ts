import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { findUniqueMock, upsertMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));

const { getAppConfig, updateAppConfig, maskSecret, toAppConfigDisplay, getAppConfigDisplay } = await import(
  "./app-config"
);

const originalGeminiApiKey = process.env.GEMINI_API_KEY;
const originalGeminiModel = process.env.GEMINI_MODEL;
const originalGeminiCorrectionModel = process.env.GEMINI_CORRECTION_MODEL;

beforeEach(() => {
  findUniqueMock.mockReset();
  upsertMock.mockReset();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_CORRECTION_MODEL;
});

afterAll(() => {
  if (originalGeminiApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalGeminiApiKey;
  if (originalGeminiModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalGeminiModel;
  if (originalGeminiCorrectionModel === undefined) delete process.env.GEMINI_CORRECTION_MODEL;
  else process.env.GEMINI_CORRECTION_MODEL = originalGeminiCorrectionModel;
});

describe("getAppConfig", () => {
  it("returns an all-null config when no row exists yet", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(getAppConfig()).resolves.toEqual({
      correctionApiKey: null,
      correctionModel: null,
      exampleApiKey: null,
      exampleModel: null,
    });
  });

  it("returns the stored row's fields", async () => {
    findUniqueMock.mockResolvedValue({
      id: "singleton",
      correctionApiKey: "sk-correction-key",
      correctionModel: "gemini-3.5-pro",
      exampleApiKey: null,
      exampleModel: null,
      updatedAt: new Date(),
    });

    await expect(getAppConfig()).resolves.toEqual({
      correctionApiKey: "sk-correction-key",
      correctionModel: "gemini-3.5-pro",
      exampleApiKey: null,
      exampleModel: null,
    });
  });
});

describe("updateAppConfig", () => {
  it("upserts against the fixed singleton id", async () => {
    upsertMock.mockResolvedValue({
      id: "singleton",
      correctionApiKey: "sk-new-key",
      correctionModel: null,
      exampleApiKey: null,
      exampleModel: null,
      updatedAt: new Date(),
    });

    await updateAppConfig({ correctionApiKey: "sk-new-key" });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: { id: "singleton", correctionApiKey: "sk-new-key" },
      update: { correctionApiKey: "sk-new-key" },
    });
  });

  it("trims a provided value and drops fields the caller did not send", async () => {
    upsertMock.mockResolvedValue({
      id: "singleton",
      correctionApiKey: "  sk-padded  ",
      correctionModel: null,
      exampleApiKey: null,
      exampleModel: null,
      updatedAt: new Date(),
    });

    await updateAppConfig({ correctionApiKey: "  sk-padded  " });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: { id: "singleton", correctionApiKey: "sk-padded" },
      update: { correctionApiKey: "sk-padded" },
    });
  });

  it("clears a field back to its env default with an empty string or null", async () => {
    upsertMock.mockResolvedValue({
      id: "singleton",
      correctionApiKey: null,
      correctionModel: null,
      exampleApiKey: null,
      exampleModel: null,
      updatedAt: new Date(),
    });

    await updateAppConfig({ correctionApiKey: "", exampleApiKey: null });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: { id: "singleton", correctionApiKey: null, exampleApiKey: null },
      update: { correctionApiKey: null, exampleApiKey: null },
    });
  });
});

describe("maskSecret", () => {
  it("returns null for an empty or missing value", () => {
    expect(maskSecret(null)).toBeNull();
    expect(maskSecret(undefined)).toBeNull();
    expect(maskSecret("")).toBeNull();
  });

  it("shows only the last 4 characters of a real key", () => {
    expect(maskSecret("sk-abcdefgh1234")).toBe("••••1234");
  });

  it("fully masks a value too short to safely reveal any of it", () => {
    expect(maskSecret("abc")).toBe("••••");
  });
});

describe("toAppConfigDisplay", () => {
  const EMPTY_CONFIG = { correctionApiKey: null, correctionModel: null, exampleApiKey: null, exampleModel: null };

  it("reports the env default model and env-derived key when nothing is admin-set", () => {
    process.env.GEMINI_API_KEY = "env-key";

    expect(toAppConfigDisplay(EMPTY_CONFIG)).toEqual({
      correction: {
        apiKeySet: false,
        apiKeyMasked: null,
        apiKeyFromEnv: true,
        model: null,
        modelDefault: "gemini-3.5-flash-lite",
      },
      example: {
        apiKeySet: false,
        apiKeyMasked: null,
        apiKeyFromEnv: true,
        model: null,
        modelDefault: "gemini-3.5-flash",
      },
    });
  });

  it("reports neither admin-set nor env-derived when nothing is configured at all", () => {
    expect(toAppConfigDisplay(EMPTY_CONFIG).correction.apiKeyFromEnv).toBe(false);
  });

  it("reports an admin-set key as such, independent of any env var", () => {
    process.env.GEMINI_API_KEY = "env-key";

    const display = toAppConfigDisplay({
      correctionApiKey: "sk-correction-1234",
      correctionModel: "gemini-3.5-pro",
      exampleApiKey: null,
      exampleModel: null,
    });

    expect(display.correction).toEqual({
      apiKeySet: true,
      apiKeyMasked: "••••1234",
      apiKeyFromEnv: false,
      model: "gemini-3.5-pro",
      modelDefault: "gemini-3.5-flash-lite",
    });
    expect(display.example.apiKeyFromEnv).toBe(true);
  });

  it("prefers an env-var model override over the hardcoded default", () => {
    process.env.GEMINI_MODEL = "gemini-custom";

    expect(toAppConfigDisplay(EMPTY_CONFIG).example.modelDefault).toBe("gemini-custom");
  });
});

describe("getAppConfigDisplay", () => {
  it("combines a DB read with the display projection", async () => {
    findUniqueMock.mockResolvedValue({
      id: "singleton",
      correctionApiKey: "sk-correction-1234",
      correctionModel: null,
      exampleApiKey: null,
      exampleModel: null,
      updatedAt: new Date(),
    });

    const display = await getAppConfigDisplay();

    expect(display.correction.apiKeySet).toBe(true);
    expect(display.correction.apiKeyMasked).toBe("••••1234");
  });
});
