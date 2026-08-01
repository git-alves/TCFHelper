import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TRANSLATABLE_MAX_CHARS } from "@/lib/app-locale";

const { authMock, fetchMock, transactionMock, executeRawMock, quotaFindUniqueMock, quotaUpsertMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  fetchMock: vi.fn(),
  transactionMock: vi.fn(),
  executeRawMock: vi.fn(),
  quotaFindUniqueMock: vi.fn(),
  quotaUpsertMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));

const { POST } = await import("./route");

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
  fetchMock.mockReset();
  transactionMock.mockReset();
  executeRawMock.mockReset();
  quotaFindUniqueMock.mockReset();
  quotaUpsertMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "google-server-secret");
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
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        data: { translations: [{ translatedText: "I enjoy learning French." }] },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/translate", () => {
  it("requires an authenticated learner", async () => {
    authMock.mockResolvedValue(null);

    const response = await post({ text: "J'aime apprendre le français.", targetLocale: "en" });

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects malformed text or an unsupported target locale", async () => {
    const response = await post({ text: "   ", targetLocale: "de" });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects text longer than the shared translatable-length limit", async () => {
    const response = await post({
      text: "a".repeat(TRANSLATABLE_MAX_CHARS + 1),
      targetLocale: "en",
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("uses Google Translation Basic v2 server-side and decodes returned HTML entities", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { translations: [{ translatedText: "J&#39;aime &amp; j&#x27;apprends." }] },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await post({
      text: "J'aime apprendre le français.",
      targetLocale: "pt",
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://translation.googleapis.com/language/translate/v2");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": "google-server-secret",
      },
      body: JSON.stringify({
        q: "J'aime apprendre le français.",
        source: "fr",
        target: "pt",
        format: "text",
      }),
      cache: "no-store",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    await expect(response.json()).resolves.toEqual({ translation: "J'aime & j'apprends." });
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

  it("returns the French source without using a key or contacting Google", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");

    const response = await post({ text: "Bonjour, tout le monde.", targetLocale: "fr" });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ translation: "Bonjour, tout le monde." });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns a configuration error without calling Google when the key is missing", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "   ");

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Translation service is not configured.",
      code: "TRANSLATION_NOT_CONFIGURED",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops a direct caller at the durable per-minute request limit before contacting Google", async () => {
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
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("stops a direct caller at the per-minute character limit before contacting Google", async () => {
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
    expect(fetchMock).not.toHaveBeenCalled();
    expect(quotaUpsertMock).not.toHaveBeenCalled();
  });

  it("stops a direct caller at the durable monthly character limit before contacting Google", async () => {
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
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(fetchMock).not.toHaveBeenCalled();
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
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("handles a Google API key failure without exposing upstream details", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 403,
            status: "PERMISSION_DENIED",
            message: "API key not valid. Please pass a valid API key.",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "es" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Translation service is temporarily unavailable." });
  });

  it("handles an unavailable upstream service without exposing the server-only key", async () => {
    fetchMock.mockRejectedValue(
      new Error("Request failed for https://translation.googleapis.com/?key=google-server-secret"),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "Translation service is temporarily unavailable." });
  });

  it("returns a cancellation response when the learner aborts the request", async () => {
    const abortController = new AbortController();
    let upstreamSignal: AbortSignal | undefined;

    fetchMock.mockImplementation((_url: URL, init?: RequestInit) => {
      upstreamSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        upstreamSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("The operation was aborted.", "AbortError")),
          { once: true },
        );
      });
    });

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

    fetchMock.mockImplementation((_url: URL, init?: RequestInit) => {
      upstreamSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        upstreamSignal?.addEventListener(
          "abort",
          () => reject(new DOMException("The operation was aborted.", "AbortError")),
          { once: true },
        );
      });
    });

    const responsePromise = post({ text: "Bonjour.", targetLocale: "en" });

    await vi.waitFor(() => expect(upstreamSignal).toBeDefined());
    await vi.advanceTimersByTimeAsync(8_000);

    const response = await responsePromise;
    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({ error: "Translation request timed out." });
  });

  it("returns a retryable error when Google returns malformed JSON or no translated text", async () => {
    fetchMock.mockResolvedValue(
      new Response("not JSON", { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "No translation was returned." });
  });
});
