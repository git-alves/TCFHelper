import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  executeRawMock,
  usageFindUniqueMock,
  usageUpsertMock,
  overrideFindUniqueMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  executeRawMock: vi.fn(),
  usageFindUniqueMock: vi.fn(),
  usageUpsertMock: vi.fn(),
  overrideFindUniqueMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));

const { reserveCorrectionUsage } = await import("./correction-usage");

const userId = "learner_1";
const now = new Date("2026-08-10T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  transactionMock.mockReset();
  executeRawMock.mockReset();
  usageFindUniqueMock.mockReset();
  usageUpsertMock.mockReset();
  overrideFindUniqueMock.mockReset();

  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      $executeRaw: executeRawMock,
      correctionUsage: {
        findUnique: usageFindUniqueMock,
        upsert: usageUpsertMock,
      },
      userQuotaOverride: { findUnique: overrideFindUniqueMock },
    }),
  );
  usageFindUniqueMock.mockResolvedValue(null);
  overrideFindUniqueMock.mockResolvedValue(null);
  usageUpsertMock.mockResolvedValue(undefined);
});

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
        monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
        monthlyRequestCount: 1,
      },
      update: {
        dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
        dailyRequestCount: 1,
        monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
        monthlyRequestCount: 1,
      },
    });
  });

  it("honors a lower correction override without writing an over-limit slot", async () => {
    usageFindUniqueMock.mockResolvedValue({
      dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
      dailyRequestCount: 1,
      monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
      monthlyRequestCount: 1,
    });
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
    usageFindUniqueMock.mockResolvedValue({
      dayStartedAt: new Date("2026-08-09T00:00:00.000Z"),
      dailyRequestCount: 99,
      monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
      monthlyRequestCount: 99,
    });
    overrideFindUniqueMock.mockResolvedValue({ correctionRequestsPerDay: 1 });

    await expect(reserveCorrectionUsage(userId)).resolves.toMatchObject({ kind: "claimed" });
    expect(usageUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ dailyRequestCount: 1 }) }),
    );
  });

  it("resets monthly reporting independently when the UTC month changes", async () => {
    usageFindUniqueMock.mockResolvedValue({
      dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
      dailyRequestCount: 2,
      monthStartedAt: new Date("2026-07-01T00:00:00.000Z"),
      monthlyRequestCount: 99,
    });

    await expect(reserveCorrectionUsage(userId)).resolves.toMatchObject({ kind: "claimed" });
    expect(usageUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          dailyRequestCount: 3,
          monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
          monthlyRequestCount: 1,
        }),
      }),
    );
  });
});
