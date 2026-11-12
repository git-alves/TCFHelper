import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  executeRawMock,
  usageFindUniqueMock,
  usageUpsertMock,
  usageUpdateMock,
  overrideFindUniqueMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  executeRawMock: vi.fn(),
  usageFindUniqueMock: vi.fn(),
  usageUpsertMock: vi.fn(),
  usageUpdateMock: vi.fn(),
  overrideFindUniqueMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));

const { correctionAttemptLimit, refundCorrectionUsage, reserveCorrectionUsage } = await import("./correction-usage");

const userId = "learner_1";
const now = new Date("2026-08-10T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  transactionMock.mockReset();
  executeRawMock.mockReset();
  usageFindUniqueMock.mockReset();
  usageUpsertMock.mockReset();
  usageUpdateMock.mockReset();
  overrideFindUniqueMock.mockReset();

  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      $executeRaw: executeRawMock,
      correctionUsage: {
        findUnique: usageFindUniqueMock,
        upsert: usageUpsertMock,
        update: usageUpdateMock,
      },
      userQuotaOverride: { findUnique: overrideFindUniqueMock },
    }),
  );
  usageFindUniqueMock.mockResolvedValue(null);
  overrideFindUniqueMock.mockResolvedValue(null);
  usageUpsertMock.mockResolvedValue(undefined);
  usageUpdateMock.mockResolvedValue(undefined);
});

const DAY = new Date("2026-08-10T00:00:00.000Z");
const MONTH = new Date("2026-08-01T00:00:00.000Z");

/** A stored row in the current window; every counter can be overridden. */
function usageRow(overrides: Record<string, unknown> = {}) {
  return {
    dayStartedAt: DAY,
    dailyRequestCount: 0,
    dailyAttemptCount: 0,
    dailyFailedCount: 0,
    monthStartedAt: MONTH,
    monthlyRequestCount: 0,
    monthlyFailedCount: 0,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("reserveCorrectionUsage", () => {
  it("starts a UTC-day counter when a learner has capacity", async () => {
    await expect(reserveCorrectionUsage(userId)).resolves.toEqual({
      kind: "claimed",
      dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
      monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
    });

    expect(usageUpsertMock).toHaveBeenCalledWith({
      where: { userId },
      create: {
        userId,
        dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
        dailyRequestCount: 1,
        dailyAttemptCount: 1,
        dailyFailedCount: 0,
        monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
        monthlyRequestCount: 1,
        monthlyFailedCount: 0,
      },
      update: {
        dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
        dailyRequestCount: 1,
        dailyAttemptCount: 1,
        dailyFailedCount: 0,
        monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
        monthlyRequestCount: 1,
        monthlyFailedCount: 0,
      },
    });
  });

  it("honors a lower correction override without writing an over-limit slot", async () => {
    usageFindUniqueMock.mockResolvedValue(
      usageRow({ dailyRequestCount: 1, dailyAttemptCount: 1, monthlyRequestCount: 1 }),
    );
    overrideFindUniqueMock.mockResolvedValue({ correctionRequestsPerDay: 1 });

    await expect(reserveCorrectionUsage(userId)).resolves.toEqual({
      kind: "dailyLimit",
      resetAt: new Date("2026-08-11T00:00:00.000Z"),
      usageValue: 2,
      quotaLimit: 1,
    });
    expect(usageUpsertMock).not.toHaveBeenCalled();
  });

  it("resets an old counter before checking the learner's current-day limit", async () => {
    usageFindUniqueMock.mockResolvedValue(
      usageRow({
        dayStartedAt: new Date("2026-08-09T00:00:00.000Z"),
        dailyRequestCount: 99,
        dailyAttemptCount: 99,
        dailyFailedCount: 7,
        monthlyRequestCount: 99,
      }),
    );
    overrideFindUniqueMock.mockResolvedValue({ correctionRequestsPerDay: 1 });

    await expect(reserveCorrectionUsage(userId)).resolves.toMatchObject({ kind: "claimed" });
    expect(usageUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ dailyRequestCount: 1, dailyAttemptCount: 1, dailyFailedCount: 0 }),
      }),
    );
  });

  it("resets monthly reporting independently when the UTC month changes", async () => {
    usageFindUniqueMock.mockResolvedValue(
      usageRow({
        dailyRequestCount: 2,
        dailyAttemptCount: 2,
        dailyFailedCount: 1,
        monthStartedAt: new Date("2026-07-01T00:00:00.000Z"),
        monthlyRequestCount: 99,
        monthlyFailedCount: 8,
      }),
    );

    await expect(reserveCorrectionUsage(userId)).resolves.toMatchObject({ kind: "claimed" });
    expect(usageUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          dailyRequestCount: 3,
          dailyFailedCount: 1,
          monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
          monthlyRequestCount: 1,
          monthlyFailedCount: 0,
        }),
      }),
    );
  });

  describe("attempt cap", () => {
    it("sizes the cap at twice the daily limit, up to a ceiling of 1000", () => {
      expect(correctionAttemptLimit(10)).toBe(20);
      expect(correctionAttemptLimit(300)).toBe(600);
      expect(correctionAttemptLimit(600)).toBe(1_000);
      expect(correctionAttemptLimit(5_000)).toBe(1_000);
      expect(correctionAttemptLimit(0)).toBe(0);
    });

    it("counts every attempt and keeps the refundable count separate", async () => {
      // 6 corrections received, 14 attempts failed and were refunded.
      usageFindUniqueMock.mockResolvedValue(usageRow({ dailyRequestCount: 6, dailyAttemptCount: 19 }));

      await expect(reserveCorrectionUsage(userId)).resolves.toMatchObject({ kind: "claimed" });
      expect(usageUpsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ dailyRequestCount: 7, dailyAttemptCount: 20 }),
        }),
      );
    });

    it("refuses with the daily-limit response once repeated failures use up the attempt cap", async () => {
      // Every earlier attempt was refunded, so dailyRequestCount alone (0)
      // would let this one through; the attempt count is what stops it.
      usageFindUniqueMock.mockResolvedValue(
        usageRow({ dailyRequestCount: 0, dailyAttemptCount: 20, dailyFailedCount: 20, monthlyFailedCount: 20 }),
      );

      await expect(reserveCorrectionUsage(userId)).resolves.toEqual({
        kind: "dailyLimit",
        resetAt: new Date("2026-08-11T00:00:00.000Z"),
        usageValue: 21,
        quotaLimit: 20,
      });
      expect(usageUpsertMock).not.toHaveBeenCalled();
    });

    it("scales the cap with a per-learner override and suspends corrections at a limit of 0", async () => {
      overrideFindUniqueMock.mockResolvedValue({ correctionRequestsPerDay: 3 });
      usageFindUniqueMock.mockResolvedValue(usageRow({ dailyAttemptCount: 6 }));
      await expect(reserveCorrectionUsage(userId)).resolves.toMatchObject({
        kind: "dailyLimit",
        quotaLimit: 6,
      });

      overrideFindUniqueMock.mockResolvedValue({ correctionRequestsPerDay: 0 });
      usageFindUniqueMock.mockResolvedValue(null);
      await expect(reserveCorrectionUsage(userId)).resolves.toMatchObject({ kind: "dailyLimit" });
      expect(usageUpsertMock).not.toHaveBeenCalled();
    });

    it("starts a new day with a fresh attempt count", async () => {
      usageFindUniqueMock.mockResolvedValue(
        usageRow({ dayStartedAt: new Date("2026-08-09T00:00:00.000Z"), dailyAttemptCount: 20, dailyFailedCount: 20 }),
      );

      await expect(reserveCorrectionUsage(userId)).resolves.toMatchObject({ kind: "claimed" });
      expect(usageUpsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ dailyAttemptCount: 1, dailyFailedCount: 0 }),
        }),
      );
    });
  });
});

describe("refundCorrectionUsage", () => {
  const reservation = { dayStartedAt: DAY, monthStartedAt: MONTH };

  it("gives back the daily and monthly count and records the failure, under the per-user lock", async () => {
    usageFindUniqueMock.mockResolvedValue(
      usageRow({ dailyRequestCount: 3, dailyAttemptCount: 3, monthlyRequestCount: 9, dailyFailedCount: 1, monthlyFailedCount: 2 }),
    );

    await expect(refundCorrectionUsage(userId, reservation)).resolves.toEqual({
      refundedDay: true,
      refundedMonth: true,
    });

    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(executeRawMock.mock.invocationCallOrder[0]).toBeLessThan(usageFindUniqueMock.mock.invocationCallOrder[0]);
    expect(usageUpdateMock).toHaveBeenCalledWith({
      where: { userId },
      data: {
        dailyRequestCount: 2,
        dailyFailedCount: 2,
        monthlyRequestCount: 8,
        monthlyFailedCount: 3,
      },
    });
    // The attempt count is never refunded.
    expect(usageUpdateMock.mock.calls[0][0].data).not.toHaveProperty("dailyAttemptCount");
  });

  it("never takes a count below zero", async () => {
    usageFindUniqueMock.mockResolvedValue(usageRow({ dailyRequestCount: 0, monthlyRequestCount: 0 }));

    await refundCorrectionUsage(userId, reservation);

    expect(usageUpdateMock).toHaveBeenCalledWith({
      where: { userId },
      data: expect.objectContaining({ dailyRequestCount: 0, monthlyRequestCount: 0 }),
    });
  });

  it("does not touch a new UTC day: only the month still matches", async () => {
    // The failure finished after midnight; the stored row already belongs to
    // the next day (the same month), whose count must not be decremented.
    usageFindUniqueMock.mockResolvedValue(
      usageRow({
        dayStartedAt: new Date("2026-08-11T00:00:00.000Z"),
        dailyRequestCount: 1,
        dailyFailedCount: 0,
        monthlyRequestCount: 10,
        monthlyFailedCount: 1,
      }),
    );

    await expect(refundCorrectionUsage(userId, reservation)).resolves.toEqual({
      refundedDay: false,
      refundedMonth: true,
    });
    expect(usageUpdateMock).toHaveBeenCalledWith({
      where: { userId },
      data: { monthlyRequestCount: 9, monthlyFailedCount: 2 },
    });
  });

  it("does not touch a new UTC month: neither window matches, so nothing is written", async () => {
    usageFindUniqueMock.mockResolvedValue(
      usageRow({
        dayStartedAt: new Date("2026-09-01T00:00:00.000Z"),
        dailyRequestCount: 1,
        monthStartedAt: new Date("2026-09-01T00:00:00.000Z"),
        monthlyRequestCount: 1,
      }),
    );

    await expect(
      refundCorrectionUsage(userId, {
        dayStartedAt: new Date("2026-08-31T00:00:00.000Z"),
        monthStartedAt: MONTH,
      }),
    ).resolves.toEqual({ refundedDay: false, refundedMonth: false });
    expect(usageUpdateMock).not.toHaveBeenCalled();
  });

  it("writes nothing when the learner has no usage row", async () => {
    usageFindUniqueMock.mockResolvedValue(null);

    await expect(refundCorrectionUsage(userId, reservation)).resolves.toEqual({
      refundedDay: false,
      refundedMonth: false,
    });
    expect(usageUpdateMock).not.toHaveBeenCalled();
  });
});
