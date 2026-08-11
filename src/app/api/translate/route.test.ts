import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRANSLATABLE_MAX_CHARS } from "@/lib/app-locale";

const {
  getCurrentActivatedAppUserMock,
  AppUserProvisioningErrorMock,
  transactionMock,
  executeRawMock,
  quotaFindUniqueMock,
  quotaUpsertMock,
  overrideFindUniqueMock,
  deeplTranslateMock,
  scraperTranslateMock,
  isFallbackCircuitOpenMock,
  recordFallbackFailureMock,
  recordFallbackSuccessMock,
  recordAdminEventMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    transactionMock: vi.fn(),
    executeRawMock: vi.fn(),
    quotaFindUniqueMock: vi.fn(),
    quotaUpsertMock: vi.fn(),
    overrideFindUniqueMock: vi.fn(),
    deeplTranslateMock: vi.fn(),
    scraperTranslateMock: vi.fn(),
    isFallbackCircuitOpenMock: vi.fn(),
    recordFallbackFailureMock: vi.fn(),
    recordFallbackSuccessMock: vi.fn(),
    recordAdminEventMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));
vi.mock("@/lib/deepl-translate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/deepl-translate")>();
  return { ...actual, translateWithDeepL: deeplTranslateMock };
});
vi.mock("@/lib/unofficial-translate", () => ({
  translateWithUnofficialScraper: scraperTranslateMock,
}));
vi.mock("@/lib/translation-fallback-circuit", () => ({
  isFallbackCircuitOpen: isFallbackCircuitOpenMock,
  recordFallbackFailure: recordFallbackFailureMock,
  recordFallbackSuccess: recordFallbackSuccessMock,
}));
vi.mock("@/lib/admin-events", () => ({ recordAdminEvent: recordAdminEventMock }));

const { POST } = await import("./route");
const { DeepLQuotaExceededError } = await import("@/lib/deepl-translate");

const LOCAL_USER_ID = "cuid_local_user_1";

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
    userId: LOCAL_USER_ID,
    minuteStartedAt: new Date("2026-07-31T12:34:00.000Z"),
    minuteRequestCount: 0,
    minuteCharacterCount: 0,
    monthStartedAt: new Date("2026-07-01T00:00:00.000Z"),
    monthCharacterCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  transactionMock.mockReset();
  executeRawMock.mockReset();
  quotaFindUniqueMock.mockReset();
  quotaUpsertMock.mockReset();
  overrideFindUniqueMock.mockReset();
  deeplTranslateMock.mockReset();
  scraperTranslateMock.mockReset();
  isFallbackCircuitOpenMock.mockReset();
  recordFallbackFailureMock.mockReset();
  recordFallbackSuccessMock.mockReset();
  recordAdminEventMock.mockReset();

  vi.stubEnv("DEEPL_API_KEY", "deepl-server-secret");
  getCurrentActivatedAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
  quotaFindUniqueMock.mockResolvedValue(null);
  quotaUpsertMock.mockResolvedValue(quotaRecord());
  overrideFindUniqueMock.mockResolvedValue(null);
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      $executeRaw: executeRawMock,
      translationQuota: {
        findUnique: quotaFindUniqueMock,
        upsert: quotaUpsertMock,
      },
      userQuotaOverride: { findUnique: overrideFindUniqueMock },
    }),
  );
  deeplTranslateMock.mockResolvedValue("I enjoy learning French.");
  scraperTranslateMock.mockResolvedValue("Scraper translation.");
  isFallbackCircuitOpenMock.mockResolvedValue(false);
  recordFallbackFailureMock.mockResolvedValue(undefined);
  recordFallbackSuccessMock.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/translate", () => {
  it("requires an authenticated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await post({ text: "J'aime apprendre le français.", targetLocale: "en" });

    expect(response.status).toBe(401);
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("fails closed while a Clerk identity cannot be safely provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(
      new AppUserProvisioningErrorMock("identity cannot be linked"),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Your account is still being set up. Please try again.",
      code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("does not disclose an unactivated account before reading or metering its request", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(401);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(deeplTranslateMock).not.toHaveBeenCalled();
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

  it("returns the French source without using a key or contacting a provider", async () => {
    const response = await post({ text: "Bonjour, tout le monde.", targetLocale: "fr" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      translation: "Bonjour, tout le monde.",
      provider: "source",
    });
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(scraperTranslateMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("uses DeepL by default and reports its provider", async () => {
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
    expect(scraperTranslateMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      translation: "I enjoy learning French.",
      provider: "deepl",
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), { timeout: 3000 });
    expect(quotaFindUniqueMock).toHaveBeenCalledWith({ where: { userId: LOCAL_USER_ID } });
    expect(quotaUpsertMock).toHaveBeenCalledWith({
      where: { userId: LOCAL_USER_ID },
      create: expect.objectContaining({
        userId: LOCAL_USER_ID,
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
    expect(executeRawMock.mock.calls[0]?.[1]).toBe(LOCAL_USER_ID);
  });

  it("uses the unofficial scraper directly when DEEPL_API_KEY is missing", async () => {
    vi.stubEnv("DEEPL_API_KEY", "   ");

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      translation: "Scraper translation.",
      provider: "unofficial",
    });
    expect(deeplTranslateMock).not.toHaveBeenCalled();
    expect(scraperTranslateMock).toHaveBeenCalledWith("Bonjour.", "en", expect.any(AbortSignal));
    expect(recordFallbackSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to the unofficial scraper when DeepL's monthly quota is exhausted", async () => {
    deeplTranslateMock.mockRejectedValue(new DeepLQuotaExceededError("quota reached"));

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      translation: "Scraper translation.",
      provider: "unofficial",
    });
    expect(scraperTranslateMock).toHaveBeenCalledWith("Bonjour.", "en", expect.any(AbortSignal));
    expect(recordFallbackSuccessMock).toHaveBeenCalledTimes(1);
  });

  it("does not use the scraper fallback for a non-quota DeepL failure", async () => {
    const unsafeProviderError = new Error("DeepL translation request failed (403): learner text must not reach logs");
    deeplTranslateMock.mockRejectedValue(unsafeProviderError);

    const response = await post({ text: "Bonjour.", targetLocale: "es" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
    });
    expect(scraperTranslateMock).not.toHaveBeenCalled();
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "TRANSLATION_PROVIDER_FAILED",
      userId: LOCAL_USER_ID,
      provider: "deepl_or_unofficial",
      reasonCode: "provider_unavailable",
      httpStatus: 502,
    });
    expect(JSON.stringify(recordAdminEventMock.mock.calls)).not.toContain(unsafeProviderError.message);
  });

  it("skips the scraper and reports unavailable when the fallback circuit is open", async () => {
    vi.stubEnv("DEEPL_API_KEY", "   ");
    isFallbackCircuitOpenMock.mockResolvedValue(true);

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
      code: "TRANSLATION_FALLBACK_UNAVAILABLE",
    });
    expect(scraperTranslateMock).not.toHaveBeenCalled();
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "TRANSLATION_PROVIDER_FAILED",
      userId: LOCAL_USER_ID,
      provider: "unofficial",
      reasonCode: "fallback_circuit_open",
      httpStatus: 503,
    });
  });

  it("records a fallback failure and reports unavailable when the scraper itself fails", async () => {
    vi.stubEnv("DEEPL_API_KEY", "   ");
    scraperTranslateMock.mockRejectedValue(new Error("scraper request failed"));

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is temporarily unavailable.",
    });
    expect(recordFallbackFailureMock).toHaveBeenCalledTimes(1);
    expect(recordFallbackSuccessMock).not.toHaveBeenCalled();
  });

  it("stops a direct caller at the durable per-minute request limit before contacting a provider", async () => {
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
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "TRANSLATION_QUOTA_DENIED",
      userId: LOCAL_USER_ID,
      reasonCode: "minute_limit",
      httpStatus: 429,
      quotaWindow: "minute",
      usageValue: 21,
      quotaLimit: 20,
    });
  });

  it("uses a learner-specific translation override inside the quota transaction", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:34:56.000Z"));
    overrideFindUniqueMock.mockResolvedValue({ translationRequestsPerMinute: 1 });
    quotaFindUniqueMock.mockResolvedValue(
      quotaRecord({ minuteRequestCount: 1, minuteCharacterCount: 100 }),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(429);
    expect(overrideFindUniqueMock).toHaveBeenCalledWith({
      where: { userId: LOCAL_USER_ID },
      select: {
        translationRequestsPerMinute: true,
        translationCharactersPerMinute: true,
        translationCharactersPerMonth: true,
      },
    });
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
      where: { userId: LOCAL_USER_ID },
      create: expect.any(Object),
      update: expect.objectContaining({
        minuteCharacterCount: 20_000,
        monthCharacterCount: 1,
      }),
    });
  });

  it("stops a direct caller at the per-minute character limit before contacting a provider", async () => {
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
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "TRANSLATION_QUOTA_DENIED",
      userId: LOCAL_USER_ID,
      reasonCode: "minute_limit",
      httpStatus: 429,
      quotaWindow: "minute",
      usageValue: 20_001,
      quotaLimit: 20_000,
    });
  });

  it("stops a direct caller at the durable monthly character limit before contacting a provider", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:34:56.000Z"));
    quotaFindUniqueMock.mockResolvedValue(
      quotaRecord({
        monthCharacterCount: 99_999,
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
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "TRANSLATION_QUOTA_DENIED",
      userId: LOCAL_USER_ID,
      reasonCode: "monthly_limit",
      httpStatus: 429,
      quotaWindow: "month",
      usageValue: 100_007,
      quotaLimit: 100_000,
    });
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
        monthCharacterCount: 100_000,
      }),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(200);
    expect(quotaUpsertMock).toHaveBeenCalledWith({
      where: { userId: LOCAL_USER_ID },
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
        userQuotaOverride: { findUnique: overrideFindUniqueMock },
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
    expect(recordAdminEventMock).not.toHaveBeenCalled();
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
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "TRANSLATION_PROVIDER_FAILED",
      userId: LOCAL_USER_ID,
      provider: "deepl_or_unofficial",
      reasonCode: "transport_error",
      httpStatus: 504,
    });
  });
});
