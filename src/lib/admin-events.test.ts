import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, upsertMock, deleteManyMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  upsertMock: vi.fn(),
  deleteManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminEvent: {
      create: createMock,
      upsert: upsertMock,
      deleteMany: deleteManyMock,
    },
  },
}));

const {
  ADMIN_EVENT_MAX_FUTURE_CLOCK_SKEW_MS,
  ADMIN_EVENT_RETENTION_DAYS,
  ADMIN_EVENT_WRITE_TIMEOUT_MS,
  formatAdminEventMessage,
  getAdminEventRetentionCutoff,
  purgeExpiredAdminEvents,
  recordAdminEvent,
} = await import("./admin-events");

const USER_ID = "c123456789012345678901234";
const ACCESS_CODE_ID = "c234567890123456789012345";

beforeEach(() => {
  createMock.mockReset();
  upsertMock.mockReset();
  deleteManyMock.mockReset();
  createMock.mockResolvedValue({ id: "event_1" });
  upsertMock.mockResolvedValue({ id: "event_1" });
  deleteManyMock.mockResolvedValue({ count: 3 });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("recordAdminEvent", () => {
  it("persists a redemption through trusted structured fields without a bearer code", async () => {
    const now = new Date("2020-08-11T12:00:00.000Z");

    await recordAdminEvent(
      { eventType: "ACCESS_CODE_REDEEMED", userId: USER_ID, accessCodeId: ACCESS_CODE_ID, httpStatus: 200 },
      now,
    );

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        occurredAt: now,
        firstOccurredAt: now,
        severity: "INFO",
        module: "QUOTA_ACCESS",
        eventType: "ACCESS_CODE_REDEEMED",
        userId: USER_ID,
        accessCodeId: ACCESS_CODE_ID,
        searchText: "access code voucher activation redeemed success",
      }),
    });
    const call = createMock.mock.calls[0]?.[0] as { data: Record<string, unknown> };
    expect(call.data).not.toHaveProperty("code");
    expect(call.data).not.toHaveProperty("message");
  });

  it("coalesces a noisy rejected-code event using a non-revealing key", async () => {
    await recordAdminEvent(
      { eventType: "ACCESS_CODE_REJECTED", userId: USER_ID, reasonCode: "invalid_or_spent", httpStatus: 400 },
      new Date("2020-08-11T12:00:00.000Z"),
    );

    expect(upsertMock).toHaveBeenCalledWith({
      where: { dedupeKey: expect.stringMatching(/^[a-f0-9]{64}$/) },
      create: expect.objectContaining({
        dedupeKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        severity: "WARN",
        module: "QUOTA_ACCESS",
        eventType: "ACCESS_CODE_REJECTED",
        reasonCode: "invalid_or_spent",
      }),
      update: expect.objectContaining({ occurrenceCount: { increment: 1 } }),
    });
  });

  it("does not change a learner response when event persistence fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createMock.mockRejectedValue(new Error("upstream error with secret"));

    await expect(
      recordAdminEvent({ eventType: "ACCESS_CODE_REDEEMED", userId: USER_ID, accessCodeId: ACCESS_CODE_ID, httpStatus: 200 }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith("Admin event persistence failed", "ACCESS_CODE_REDEEMED");
    expect(errorSpy).not.toHaveBeenCalledWith(expect.anything(), expect.stringContaining("secret"));
  });

  it.each<[string, Record<string, unknown>]>([
    ["an unknown event type", { eventType: "PROVIDER_ERROR: raw upstream secret" }],
    [
      "an unknown reason code",
      { eventType: "EXAMPLE_PROVIDER_FAILED", userId: USER_ID, provider: "gemini", reasonCode: "raw upstream secret", httpStatus: 502 },
    ],
    [
      "an unknown provider",
      { eventType: "EXAMPLE_PROVIDER_FAILED", userId: USER_ID, provider: "https://secret.example", reasonCode: "provider_unavailable", httpStatus: 502 },
    ],
    [
      "an out-of-range HTTP status",
      { eventType: "ACCESS_CODE_REJECTED", userId: USER_ID, reasonCode: "invalid_or_spent", httpStatus: 600 },
    ],
    [
      "a bearer code instead of an opaque row id",
      { eventType: "ACCESS_CODE_REDEEMED", userId: USER_ID, accessCodeId: "TCF-PRO-2026", httpStatus: 200 },
    ],
    [
      "an arbitrary free-form field",
      { eventType: "ACCESS_CODE_REDEEMED", userId: USER_ID, accessCodeId: ACCESS_CODE_ID, httpStatus: 200, message: "user text or secret" },
    ],
    [
      "a partial quota snapshot",
      { eventType: "TRANSLATION_QUOTA_DENIED", userId: USER_ID, reasonCode: "minute_request_limit", httpStatus: 429, quotaWindow: "minute", usageValue: 5 },
    ],
  ])("rejects %s without persisting it", async (_description, unsafeInput) => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(recordAdminEvent(unsafeInput as unknown as Parameters<typeof recordAdminEvent>[0])).resolves.toBeUndefined();

    expect(createMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Admin event rejected by validation");
  });

  it("rejects a closed value used under the wrong event type", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await recordAdminEvent({
      eventType: "TRANSLATION_QUOTA_DENIED",
      userId: USER_ID,
      reasonCode: "daily_limit" as never,
      httpStatus: 429,
      quotaWindow: "day" as never,
      usageValue: 5,
      quotaLimit: 5,
    });

    expect(createMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Admin event rejected by validation");
  });

  it("snapshots a getter-backed input before validating and persisting it", async () => {
    let accessCodeReads = 0;
    const input = {
      eventType: "ACCESS_CODE_REDEEMED" as const,
      userId: USER_ID,
      httpStatus: 200 as const,
      get accessCodeId() {
        accessCodeReads += 1;
        return accessCodeReads === 1 ? ACCESS_CODE_ID : "TCF-PRO-2026";
      },
    };

    await recordAdminEvent(input);

    expect(accessCodeReads).toBe(1);
    expect(createMock).toHaveBeenCalledWith({ data: expect.objectContaining({ accessCodeId: ACCESS_CODE_ID }) });
  });

  it("uses distinct coalescing keys when the safe quota facts change", async () => {
    const now = new Date("2020-08-11T12:00:00.000Z");
    const base = {
      eventType: "TRANSLATION_QUOTA_DENIED" as const,
      userId: USER_ID,
      reasonCode: "minute_request_limit" as const,
      httpStatus: 429,
      quotaWindow: "minute" as const,
      usageValue: 21,
    };

    await recordAdminEvent({ ...base, quotaLimit: 20 }, now);
    await recordAdminEvent({ ...base, quotaLimit: 25 }, now);

    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock.mock.calls[0]?.[0].where.dedupeKey).not.toBe(upsertMock.mock.calls[1]?.[0].where.dedupeKey);
  });

  it("rejects a far-future clock value so retention cannot be bypassed", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const future = new Date(Date.now() + ADMIN_EVENT_MAX_FUTURE_CLOCK_SKEW_MS + 1);

    await recordAdminEvent(
      { eventType: "ACCESS_CODE_REDEEMED", userId: USER_ID, accessCodeId: ACCESS_CODE_ID, httpStatus: 200 },
      future,
    );

    expect(createMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Admin event rejected by validation");
  });

  it("treats an unreadable caller-supplied clock as an invalid event", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const poisonedClock = new Date();
    vi.spyOn(poisonedClock, "getTime").mockImplementation(() => {
      throw new Error("unsafe clock input");
    });

    await expect(
      recordAdminEvent(
        { eventType: "ACCESS_CODE_REDEEMED", userId: USER_ID, accessCodeId: ACCESS_CODE_ID, httpStatus: 200 },
        poisonedClock,
      ),
    ).resolves.toBeUndefined();

    expect(createMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith("Admin event rejected by validation");
  });

  it("returns after a short deadline when an event write never settles", async () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    createMock.mockReturnValue(new Promise(() => undefined));

    const write = recordAdminEvent({
      eventType: "ACCESS_CODE_REDEEMED",
      userId: USER_ID,
      accessCodeId: ACCESS_CODE_ID,
      httpStatus: 200,
    });
    await vi.advanceTimersByTimeAsync(ADMIN_EVENT_WRITE_TIMEOUT_MS);

    await expect(write).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("Admin event persistence timed out", "ACCESS_CODE_REDEEMED");
  });

  it("also bounds a coalesced upsert that never settles", async () => {
    vi.useFakeTimers();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    upsertMock.mockReturnValue(new Promise(() => undefined));

    const write = recordAdminEvent({
      eventType: "ACCESS_CODE_REJECTED",
      userId: USER_ID,
      reasonCode: "invalid_or_spent",
      httpStatus: 400,
    });
    await vi.advanceTimersByTimeAsync(ADMIN_EVENT_WRITE_TIMEOUT_MS);

    await expect(write).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("Admin event persistence timed out", "ACCESS_CODE_REJECTED");
  });
});

describe("admin-event retention", () => {
  it("uses a precise 30-day rolling cutoff", () => {
    const now = new Date("2026-08-31T12:34:56.000Z");

    expect(ADMIN_EVENT_RETENTION_DAYS).toBe(30);
    expect(getAdminEventRetentionCutoff(now)).toEqual(new Date("2026-08-01T12:34:56.000Z"));
  });

  it("deletes only rows older than the retention cutoff", async () => {
    const now = new Date("2026-08-31T12:34:56.000Z");

    await expect(purgeExpiredAdminEvents(now)).resolves.toEqual({ count: 3 });

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { occurredAt: { lt: new Date("2026-08-01T12:34:56.000Z") } },
    });
  });
});

describe("formatAdminEventMessage", () => {
  it("renders a closed, contextual message rather than a stored provider error", () => {
    expect(
      formatAdminEventMessage({
        eventType: "CORRECTION_PROVIDER_FAILED",
        provider: "gemini",
        reasonCode: "transport_error",
        quotaWindow: null,
        usageValue: null,
        quotaLimit: null,
        occurrenceCount: 2,
      }),
    ).toBe("Correction generation failed (gemini): transport error. (2 occurrences)");
  });

  it("never interpolates malformed persisted values into display copy", () => {
    expect(
      formatAdminEventMessage({
        eventType: "CORRECTION_PROVIDER_FAILED",
        provider: "https://provider.example/secret",
        reasonCode: "raw upstream exception with learner text",
        quotaWindow: "forever",
        usageValue: -1,
        quotaLimit: 0,
        occurrenceCount: 0,
      }),
    ).toBe("Correction generation failed: provider error.");

    expect(
      formatAdminEventMessage({
        eventType: "RAW EVENT: learner draft",
        provider: null,
        reasonCode: null,
        quotaWindow: null,
        usageValue: null,
        quotaLimit: null,
        occurrenceCount: 1,
      }),
    ).toBe("Operational event recorded.");
  });
});
