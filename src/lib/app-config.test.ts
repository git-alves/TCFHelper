import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { findUniqueMock, upsertMock, getGeminiRequestsTodayMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
  getGeminiRequestsTodayMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appConfig: {
      findUnique: findUniqueMock,
      upsert: upsertMock,
    },
  },
}));
vi.mock("@/lib/admin-overview", () => ({
  getGeminiRequestsToday: getGeminiRequestsTodayMock,
}));

const { getAppConfig, updateAppConfig, maskSecret, getAppConfigDisplay, DEFAULT_GEMINI_DAILY_REQUEST_LIMIT } =
  await import("./app-config");

const EMPTY_ROW = {
  id: "singleton",
  correctionApiKey: null,
  correctionModel: null,
  correctionDailyLimit: null,
  exampleApiKey: null,
  exampleModel: null,
  exampleDailyLimit: null,
  updatedAt: new Date(),
};

const originalGeminiApiKey = process.env.GEMINI_API_KEY;
const originalGeminiModel = process.env.GEMINI_MODEL;
const originalGeminiCorrectionModel = process.env.GEMINI_CORRECTION_MODEL;

beforeEach(() => {
  findUniqueMock.mockReset();
  upsertMock.mockReset();
  getGeminiRequestsTodayMock.mockReset();
  getGeminiRequestsTodayMock.mockResolvedValue({ correctionRequestsToday: 0, exampleRequestsToday: 0 });
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
      correctionDailyLimit: null,
      exampleApiKey: null,
      exampleModel: null,
      exampleDailyLimit: null,
    });
  });

  it("returns the stored row's fields", async () => {
    findUniqueMock.mockResolvedValue({
      ...EMPTY_ROW,
      correctionApiKey: "sk-correction-key",
      correctionModel: "gemini-3.5-pro",
      correctionDailyLimit: 250,
    });

    await expect(getAppConfig()).resolves.toEqual({
      correctionApiKey: "sk-correction-key",
      correctionModel: "gemini-3.5-pro",
      correctionDailyLimit: 250,
      exampleApiKey: null,
      exampleModel: null,
      exampleDailyLimit: null,
    });
  });
});

describe("updateAppConfig", () => {
  it("upserts against the fixed singleton id", async () => {
    upsertMock.mockResolvedValue({ ...EMPTY_ROW, correctionApiKey: "sk-new-key" });

    await updateAppConfig({ correctionApiKey: "sk-new-key" });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: { id: "singleton", correctionApiKey: "sk-new-key" },
      update: { correctionApiKey: "sk-new-key" },
    });
  });

  it("trims a provided text value and drops fields the caller did not send", async () => {
    upsertMock.mockResolvedValue({ ...EMPTY_ROW, correctionApiKey: "sk-padded" });

    await updateAppConfig({ correctionApiKey: "  sk-padded  " });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: { id: "singleton", correctionApiKey: "sk-padded" },
      update: { correctionApiKey: "sk-padded" },
    });
  });

  it("clears a text field back to its env default with an empty string or null", async () => {
    upsertMock.mockResolvedValue(EMPTY_ROW);

    await updateAppConfig({ correctionApiKey: "", exampleApiKey: null });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: { id: "singleton", correctionApiKey: null, exampleApiKey: null },
      update: { correctionApiKey: null, exampleApiKey: null },
    });
  });

  it("passes a numeric daily limit through untrimmed", async () => {
    upsertMock.mockResolvedValue({ ...EMPTY_ROW, correctionDailyLimit: 500 });

    await updateAppConfig({ correctionDailyLimit: 500 });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: { id: "singleton", correctionDailyLimit: 500 },
      update: { correctionDailyLimit: 500 },
    });
  });

  it("clears a daily limit back to the built-in default with null", async () => {
    upsertMock.mockResolvedValue(EMPTY_ROW);

    await updateAppConfig({ exampleDailyLimit: null });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: "singleton" },
      create: { id: "singleton", exampleDailyLimit: null },
      update: { exampleDailyLimit: null },
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

describe("getAppConfigDisplay", () => {
  it("reports the env default model, env-derived key, and built-in daily limit when nothing is admin-set", async () => {
    process.env.GEMINI_API_KEY = "env-key";
    findUniqueMock.mockResolvedValue(null);

    await expect(getAppConfigDisplay()).resolves.toEqual({
      correction: {
        apiKeySet: false,
        apiKeyMasked: null,
        apiKeyFromEnv: true,
        model: null,
        modelDefault: "gemini-3.5-flash-lite",
        dailyLimit: DEFAULT_GEMINI_DAILY_REQUEST_LIMIT,
        dailyLimitDefault: DEFAULT_GEMINI_DAILY_REQUEST_LIMIT,
        dailyLimitIsDefault: true,
        requestsToday: 0,
      },
      example: {
        apiKeySet: false,
        apiKeyMasked: null,
        apiKeyFromEnv: true,
        model: null,
        modelDefault: "gemini-3.5-flash",
        dailyLimit: DEFAULT_GEMINI_DAILY_REQUEST_LIMIT,
        dailyLimitDefault: DEFAULT_GEMINI_DAILY_REQUEST_LIMIT,
        dailyLimitIsDefault: true,
        requestsToday: 0,
      },
    });
  });

  it("reports neither admin-set nor env-derived when nothing is configured at all", async () => {
    findUniqueMock.mockResolvedValue(null);

    const display = await getAppConfigDisplay();

    expect(display.correction.apiKeyFromEnv).toBe(false);
  });

  it("reports an admin-set key and a custom daily limit, independent of any env var", async () => {
    process.env.GEMINI_API_KEY = "env-key";
    findUniqueMock.mockResolvedValue({
      ...EMPTY_ROW,
      correctionApiKey: "sk-correction-1234",
      correctionModel: "gemini-3.5-pro",
      correctionDailyLimit: 250,
    });

    const display = await getAppConfigDisplay();

    expect(display.correction).toMatchObject({
      apiKeySet: true,
      apiKeyMasked: "••••1234",
      apiKeyFromEnv: false,
      model: "gemini-3.5-pro",
      dailyLimit: 250,
      dailyLimitIsDefault: false,
    });
    expect(display.example.apiKeyFromEnv).toBe(true);
  });

  it("prefers an env-var model override over the hardcoded default", async () => {
    process.env.GEMINI_MODEL = "gemini-custom";
    findUniqueMock.mockResolvedValue(null);

    const display = await getAppConfigDisplay();

    expect(display.example.modelDefault).toBe("gemini-custom");
  });

  it("reports today's actual request counts from getGeminiRequestsToday", async () => {
    findUniqueMock.mockResolvedValue(null);
    getGeminiRequestsTodayMock.mockResolvedValue({ correctionRequestsToday: 42, exampleRequestsToday: 7 });

    const display = await getAppConfigDisplay();

    expect(display.correction.requestsToday).toBe(42);
    expect(display.example.requestsToday).toBe(7);
  });
});
