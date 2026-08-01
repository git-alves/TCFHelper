import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRANSLATABLE_MAX_CHARS } from "@/lib/app-locale";

const { authMock, transactionMock, executeRawMock, quotaFindUniqueMock, quotaUpsertMock, deeplTranslateMock } =
  vi.hoisted(() => ({
    authMock: vi.fn(),
    transactionMock: vi.fn(),
    executeRawMock: vi.fn(),
    quotaFindUniqueMock: vi.fn(),
    quotaUpsertMock: vi.fn(),
    deeplTranslateMock: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));
vi.mock("@/lib/deepl-translate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/deepl-translate")>();
  return { ...actual, translateWithDeepL: deeplTranslateMock };
});

const { POST } = await import("./route");
const { DeepLQuotaExceededError } = await import("@/lib/deepl-translate");

function post(body: unknown, signal?: AbortSignal) {
  return POST(
    new Request("http://localhost/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    }),
  );
}

function quotaRecord(overrides: Record<string, unknown> = {}) {
  return {
    userId: "user_1",
    minuteStartedAt: new Date("2026-07-31T12:34:00.000Z"),
    minuteRequestCount: 0,
    minuteCharacterCount: 0,
    monthStartedAt: new Date("2026-07-01T00:00:00.000Z"),
    monthCharacterCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  authMock.mockReset();
  transactionMock.mockReset();
  executeRawMock.mockReset();
  quotaFindUniqueMock.mockReset();
  quotaUpsertMock.mockReset();
  deeplTranslateMock.mockReset();

  vi.stubEnv("DEEPL_API_KEY", "deepl-server-secret");
  authMock.mockResolvedValue({ user: { id: "user_1" } });
  quotaFindUniqueMock.mockResolvedValue(null);
  quotaUpsertMock.mockResolvedValue(quotaRecord());
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      $executeRaw: executeRawMock,
      translationQuota: {
        findUnique: quotaFindUniqueMock,
        upsert: quotaUpsertMock,
      },
    }),
  );
  deeplTranslateMock.mockResolvedValue("I enjoy learning French.");
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/translate", () => {
  it("requires an authenticated learner", async () => {
    authMock.mockResolvedValue(null);

    const response = await post({ text: "J'aime apprendre le français.", targetLocale: "en" });

    expect(response.status).toBe(401);
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects malformed text or an unsupported target locale", async () => {
    const response = await post({ text: "   ", targetLocale: "de" });

    expect(response.status).toBe(400);
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects text longer than the shared translatable-length limit", async () => {
    const response = await post({
      text: "a".repeat(TRANSLATABLE_MAX_CHARS + 1),
      targetLocale: "en",
    });

    expect(response.status).toBe(400);
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns the French source without using a key or contacting DeepL", async () => {
    const response = await post({ text: "Bonjour, tout le monde.", targetLocale: "fr" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ translation: "Bonjour, tout le monde." });
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("uses DeepL server-side", async () => {
    const response = await post({
      text: "J'aime apprendre le français.",
      targetLocale: "pt",
    });

    expect(response.status).toBe(200);
    expect(deeplTranslateMock).toHaveBeenCalledWith(
      "J'aime apprendre le français.",
      "pt",
      "deepl-server-secret",
      expect.any(AbortSignal),
    );
    await expect(response.json()).resolves.toEqual({ translation: "I enjoy learning French." });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
    expect(quotaFindUniqueMock).toHaveBeenCalledWith({ where: { userId: "user_1" } });
    expect(quotaUpsertMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: expect.objectContaining({
        userId: "user_1",
        minuteRequestCount: 1,
        minuteCharacterCount: 29,
        monthCharacterCount: 29,
      }),
      update: expect.objectContaining({
        minuteRequestCount: 1,
        minuteCharacterCount: 29,
        monthCharacterCount: 29,
      }),
    });
    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    expect(executeRawMock.mock.calls[0]?.[1]).toBe("user_1");
  });

  it("returns a configuration error without calling DeepL when the key is missing", async () => {
    vi.stubEnv("DEEPL_API_KEY", "   ");

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is not configured.",
      code: "TRANSLATION_NOT_CONFIGURED",
    });
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("fails closed with a generic unavailable response when DeepL's monthly quota is exhausted", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    deeplTranslateMock.mockRejectedValue(new DeepLQuotaExceededError("quota reached"));

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
    });
    expect(warnSpy).toHaveBeenCalledWith("DeepL monthly quota exhausted.");
  });

  it("fails closed with a generic unavailable response for any other DeepL failure", async () => {
    deeplTranslateMock.mockRejectedValue(new Error("DeepL translation request failed (403)"));

    const response = await post({ text: "Bonjour.", targetLocale: "es" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
    });
  });

  it("stops a direct caller at the durable per-minute request limit before contacting DeepL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:34:56.000Z"));
    quotaFindUniqueMock.mockResolvedValue(
      quotaRecord({
        minuteRequestCount: 20,
        minuteCharacterCount: 100,
      }),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
      code: "TRANSLATION_RATE_LIMITED",
      resetAt: "2026-07-31T12:35:00.000Z",
    });
    expect(response.headers.get("Retry-After")).toBe("4");
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(quotaUpsertMock).not.toHaveBeenCalled();
  });

  it("meters Unicode input as code points rather than UTF-16 code units", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:34:56.000Z"));
    quotaFindUniqueMock.mockResolvedValue(
      quotaRecord({
        minuteCharacterCount: 19_999,
      }),
    );

    const response = await post({ text: "😀", targetLocale: "en" });

    expect(response.status).toBe(200);
    expect(quotaUpsertMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: expect.any(Object),
      update: expect.objectContaining({
        minuteCharacterCount: 20_000,
        monthCharacterCount: 1,
      }),
    });
  });

  it("stops a direct caller at the per-minute character limit before contacting DeepL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:34:56.000Z"));
    quotaFindUniqueMock.mockResolvedValue(
      quotaRecord({
        minuteCharacterCount: 20_000,
      }),
    );

    const response = await post({ text: "a", targetLocale: "en" });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
      code: "TRANSLATION_RATE_LIMITED",
      resetAt: "2026-07-31T12:35:00.000Z",
    });
    expect(response.headers.get("Retry-After")).toBe("4");
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(quotaUpsertMock).not.toHaveBeenCalled();
  });

  it("stops a direct caller at the durable monthly character limit before contacting DeepL", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:34:56.000Z"));
    quotaFindUniqueMock.mockResolvedValue(
      quotaRecord({
        monthCharacterCount: 49_999,
      }),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
      code: "TRANSLATION_MONTHLY_QUOTA_REACHED",
      resetAt: "2026-08-01T00:00:00.000Z",
    });
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(quotaUpsertMock).not.toHaveBeenCalled();
  });

  it("resets prior UTC windows instead of permanently blocking a learner", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:12.000Z"));
    quotaFindUniqueMock.mockResolvedValue(
      quotaRecord({
        minuteStartedAt: new Date("2026-07-31T23:59:00.000Z"),
        minuteRequestCount: 20,
        minuteCharacterCount: 20_000,
        monthStartedAt: new Date("2026-07-01T00:00:00.000Z"),
        monthCharacterCount: 50_000,
      }),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(200);
    expect(quotaUpsertMock).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: expect.any(Object),
      update: expect.objectContaining({
        minuteStartedAt: new Date("2026-08-01T00:00:00.000Z"),
        minuteRequestCount: 1,
        minuteCharacterCount: 8,
        monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
        monthCharacterCount: 8,
      }),
    });
  });

  it("fails closed if the durable quota reservation cannot be completed", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    transactionMock.mockRejectedValue(new Error("database unavailable"));

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
      code: "TRANSLATION_QUOTA_UNAVAILABLE",
    });
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Translation quota reservation failed");
  });

  it("keeps conservative attempted-request accounting when a client aborts after reservation", async () => {
    const abortController = new AbortController();
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
      const reservation = await callback({
        $executeRaw: executeRawMock,
        translationQuota: {
          findUnique: quotaFindUniqueMock,
          upsert: quotaUpsertMock,
        },
      });
      abortController.abort();
      return reservation;
    });

    const response = await post(
      { text: "Bonjour.", targetLocale: "en" },
      abortController.signal,
    );

    expect(response.status).toBe(499);
    await expect(response.json()).resolves.toEqual({ error: "Translation request was cancelled." });
    expect(quotaUpsertMock).toHaveBeenCalledTimes(1);
    expect(deeplTranslateMock).not.toHaveBeenCalled();
  });

  it("returns a cancellation response when the learner aborts the request", async () => {
    const abortController = new AbortController();
    let upstreamSignal: AbortSignal | undefined;

    deeplTranslateMock.mockImplementation(
      (_text: string, _locale: string, _key: string, signal: AbortSignal) => {
        upstreamSignal = signal;
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("The operation was aborted.", "AbortError")),
            { once: true },
          );
        });
      },
    );

    const responsePromise = post({ text: "Bonjour.", targetLocale: "en" }, abortController.signal);

    await vi.waitFor(() => expect(upstreamSignal).toBeDefined());
    abortController.abort();

    const response = await responsePromise;
    expect(response.status).toBe(499);
    await expect(response.json()).resolves.toEqual({ error: "Translation request was cancelled." });
  });

  it("times out a stalled upstream request", async () => {
    vi.useFakeTimers();
    let upstreamSignal: AbortSignal | undefined;

    deeplTranslateMock.mockImplementation(
      (_text: string, _locale: string, _key: string, signal: AbortSignal) => {
        upstreamSignal = signal;
        return new Promise<string>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("The operation was aborted.", "AbortError")),
            { once: true },
          );
        });
      },
    );

    const responsePromise = post({ text: "Bonjour.", targetLocale: "en" });

    await vi.waitFor(() => expect(upstreamSignal).toBeDefined());
    await vi.advanceTimersByTimeAsync(8_000);

    const response = await responsePromise;
    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({ error: "Translation request timed out." });
  });
});
