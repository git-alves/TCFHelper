import { beforeEach, describe, expect, it, vi } from "vitest";

const { transactionMock, executeRawMock, leaseFindMock, answerUpsertMock, leaseDeleteMock, quotaUpdateManyMock } =
  vi.hoisted(() => ({
    transactionMock: vi.fn(),
    executeRawMock: vi.fn(),
    leaseFindMock: vi.fn(),
    answerUpsertMock: vi.fn(),
    leaseDeleteMock: vi.fn(),
    quotaUpdateManyMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
  },
}));

import {
  cacheExample,
  claimExampleGeneration,
  refundExampleGenerationLease,
  releaseExampleGenerationLease,
} from "./example-answer-cache";

const cacheKey = ["learner_1", "TASK_2", "B2" as const, "topic_hash"] as const;
const reservationDay = new Date("2026-08-05T00:00:00.000Z");

beforeEach(() => {
  transactionMock.mockReset();
  executeRawMock.mockReset();
  leaseFindMock.mockReset();
  answerUpsertMock.mockReset();
  leaseDeleteMock.mockReset();
  quotaUpdateManyMock.mockReset();
  leaseDeleteMock.mockResolvedValue({ count: 1 });
  quotaUpdateManyMock.mockResolvedValue({ count: 1 });
  transactionMock.mockImplementation((callback) =>
    callback({
      $executeRaw: executeRawMock,
      exampleGenerationLease: { findUnique: leaseFindMock, deleteMany: leaseDeleteMock },
      exampleAnswer: { upsert: answerUpsertMock },
      exampleGenerationQuota: { updateMany: quotaUpdateManyMock },
    }),
  );
});

describe("example answer lease ownership", () => {
  it("does not let an expired owner cache or delete a newer owner's lease", async () => {
    leaseFindMock.mockResolvedValue({ claimToken: "new-owner" });

    await expect(
      cacheExample(...cacheKey, "Réponse tardive.", "gemini", "old-owner"),
    ).resolves.toBeNull();

    expect(answerUpsertMock).not.toHaveBeenCalled();
    expect(leaseDeleteMock).not.toHaveBeenCalled();
  });
});

describe("releaseExampleGenerationLease (cleanup only)", () => {
  it("deletes the lease without touching the daily quota", async () => {
    await releaseExampleGenerationLease(...cacheKey, "owner_1");

    expect(leaseDeleteMock).toHaveBeenCalledWith({
      where: {
        userId: "learner_1",
        taskType: "TASK_2",
        level: "B2",
        topicHash: "topic_hash",
        claimToken: "owner_1",
      },
    });
    expect(quotaUpdateManyMock).not.toHaveBeenCalled();
  });
});

describe("refundExampleGenerationLease", () => {
  it("refunds the exact UTC day the reservation was made for, read back from the lease itself", async () => {
    leaseFindMock.mockResolvedValue({ claimToken: "owner_1", dayStartedAt: reservationDay });

    await refundExampleGenerationLease(...cacheKey, "owner_1");

    expect(leaseDeleteMock).toHaveBeenCalledWith({
      where: { userId: "learner_1", taskType: "TASK_2", level: "B2", topicHash: "topic_hash", claimToken: "owner_1" },
    });
    // Not "today" at refund time — the day persisted on the lease at claim
    // time, so a request straddling UTC midnight cannot refund the wrong day.
    expect(quotaUpdateManyMock).toHaveBeenCalledWith({
      where: { userId: "learner_1", dayStartedAt: reservationDay, dailyRequestCount: { gt: 0 } },
      data: { dailyRequestCount: { decrement: 1 } },
    });
  });

  it("takes the per-key lock before the per-user lock, matching claimExampleGeneration's order", async () => {
    leaseFindMock.mockResolvedValue({ claimToken: "owner_1", dayStartedAt: reservationDay });

    await refundExampleGenerationLease(...cacheKey, "owner_1");

    const lockCalls = executeRawMock.mock.calls.map((call) => call.join(""));
    expect(lockCalls.length).toBe(2);
    expect(lockCalls[0]).toContain("learner_1:TASK_2:B2:topic_hash");
    expect(lockCalls[1]).toContain("learner_1");
    expect(lockCalls[1]).not.toContain("topic_hash");
  });

  it("does not refund or delete when this call lost the race to a newer claim", async () => {
    leaseFindMock.mockResolvedValue({ claimToken: "new-owner", dayStartedAt: reservationDay });

    const result = await refundExampleGenerationLease(...cacheKey, "stale-owner");

    expect(result).toEqual({ count: 0 });
    expect(leaseDeleteMock).not.toHaveBeenCalled();
    expect(quotaUpdateManyMock).not.toHaveBeenCalled();
  });

  it("does not refund or delete when the lease is already gone", async () => {
    leaseFindMock.mockResolvedValue(null);

    const result = await refundExampleGenerationLease(...cacheKey, "owner_1");

    expect(result).toEqual({ count: 0 });
    expect(leaseDeleteMock).not.toHaveBeenCalled();
    expect(quotaUpdateManyMock).not.toHaveBeenCalled();
  });
});

describe("claimExampleGeneration", () => {
  const answerFindMock = vi.fn();
  const quotaFindMock = vi.fn();
  const quotaUpsertMock = vi.fn();
  const leaseUpsertMock = vi.fn();

  beforeEach(() => {
    answerFindMock.mockReset();
    quotaFindMock.mockReset();
    quotaUpsertMock.mockReset();
    leaseUpsertMock.mockReset();
    answerFindMock.mockResolvedValue(null);
    leaseFindMock.mockResolvedValue(null);
    quotaFindMock.mockResolvedValue(null);
    transactionMock.mockImplementation((callback) =>
      callback({
        $executeRaw: executeRawMock,
        exampleAnswer: { findUnique: answerFindMock },
        exampleGenerationLease: { findUnique: leaseFindMock, upsert: leaseUpsertMock },
        exampleGenerationQuota: { findUnique: quotaFindMock, upsert: quotaUpsertMock },
      }),
    );
  });

  it("persists the reservation's UTC day on the lease it creates", async () => {
    await claimExampleGeneration(...cacheKey);

    expect(leaseUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ dayStartedAt: expect.any(Date) }),
        update: expect.objectContaining({ dayStartedAt: expect.any(Date) }),
      }),
    );
    const { dayStartedAt } = leaseUpsertMock.mock.calls[0][0].create;
    expect(dayStartedAt.toISOString()).toMatch(/T00:00:00\.000Z$/);
  });

  it("computes the reservation day from a timestamp taken after the per-user lock, not before it", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T23:59:59.900Z"));

    // Two advisory locks are taken in order: per-key, then per-user. Only
    // the second (the per-user lock) is simulated as blocking across the
    // UTC day boundary, mirroring a real lock wait.
    let lockCallCount = 0;
    executeRawMock.mockImplementation(async () => {
      lockCallCount += 1;
      if (lockCallCount === 2) {
        vi.setSystemTime(new Date("2026-08-06T00:00:00.200Z"));
      }
    });

    await claimExampleGeneration(...cacheKey);

    expect(lockCallCount).toBe(2);
    const { dayStartedAt } = leaseUpsertMock.mock.calls[0][0].create;
    expect(dayStartedAt.toISOString()).toBe("2026-08-06T00:00:00.000Z");

    vi.useRealTimers();
  });

  it("records the attempt timestamp so a refunded failure still bounds the retry rate", async () => {
    await claimExampleGeneration(...cacheKey);

    expect(quotaUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ lastAttemptAt: expect.any(Date) }),
        update: expect.objectContaining({ lastAttemptAt: expect.any(Date) }),
      }),
    );
  });

  it("rejects a claim within the cooldown window without spending a daily slot", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:05.000Z"));
    quotaFindMock.mockResolvedValue({
      dayStartedAt: new Date("2026-08-05T00:00:00.000Z"),
      dailyRequestCount: 1,
      dailyAttemptCount: 1,
      lastAttemptAt: new Date("2026-08-05T12:00:00.000Z"),
    });

    const result = await claimExampleGeneration(...cacheKey);

    expect(result).toEqual({ kind: "cooldown", retryAt: new Date("2026-08-05T12:00:10.000Z") });
    expect(quotaUpsertMock).not.toHaveBeenCalled();
    expect(leaseUpsertMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("allows a claim once the cooldown window has passed", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:10.001Z"));
    quotaFindMock.mockResolvedValue({
      dayStartedAt: new Date("2026-08-05T00:00:00.000Z"),
      dailyRequestCount: 1,
      dailyAttemptCount: 1,
      lastAttemptAt: new Date("2026-08-05T12:00:00.000Z"),
    });

    const result = await claimExampleGeneration(...cacheKey);

    expect(result).toEqual(expect.objectContaining({ kind: "claimed" }));
    expect(quotaUpsertMock).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("blocks further claims once the daily attempt cap is reached, even though every attempt was refunded", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:01:00.000Z"));
    quotaFindMock.mockResolvedValue({
      dayStartedAt: new Date("2026-08-05T00:00:00.000Z"),
      // A refunded failure keeps dailyRequestCount at 0 forever, so only
      // dailyAttemptCount (never refunded) can be what stops this claim.
      dailyRequestCount: 0,
      dailyAttemptCount: 15,
      lastAttemptAt: new Date("2026-08-05T12:00:00.000Z"),
    });

    const result = await claimExampleGeneration(...cacheKey);

    expect(result).toEqual({ kind: "dailyLimit", resetAt: new Date("2026-08-06T00:00:00.000Z") });
    expect(quotaUpsertMock).not.toHaveBeenCalled();
    expect(leaseUpsertMock).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("persists the incremented attempt count, distinct from and independent of the refundable request count", async () => {
    quotaFindMock.mockResolvedValue({
      dayStartedAt: new Date("2026-08-05T00:00:00.000Z"),
      dailyRequestCount: 0,
      dailyAttemptCount: 4,
      lastAttemptAt: new Date("2026-08-05T11:00:00.000Z"),
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:00.000Z"));

    await claimExampleGeneration(...cacheKey);

    expect(quotaUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ dailyAttemptCount: 5 }),
        update: expect.objectContaining({ dailyAttemptCount: 5 }),
      }),
    );

    vi.useRealTimers();
  });

  it("resets the attempt cap on a new UTC day", async () => {
    quotaFindMock.mockResolvedValue({
      dayStartedAt: new Date("2026-08-04T00:00:00.000Z"),
      dailyRequestCount: 0,
      dailyAttemptCount: 15,
      lastAttemptAt: new Date("2026-08-04T23:59:00.000Z"),
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T00:00:01.000Z"));

    const result = await claimExampleGeneration(...cacheKey);

    expect(result).toEqual(expect.objectContaining({ kind: "claimed" }));
    expect(quotaUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ dailyAttemptCount: 1 }),
      }),
    );

    vi.useRealTimers();
  });
});

describe("refundExampleGenerationLease and the durable attempt cap", () => {
  it("never touches dailyAttemptCount, only dailyRequestCount", async () => {
    leaseFindMock.mockResolvedValue({ claimToken: "owner_1", dayStartedAt: reservationDay });

    await refundExampleGenerationLease(...cacheKey, "owner_1");

    expect(quotaUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { dailyRequestCount: { decrement: 1 } } }),
    );
    const updateManyCall = quotaUpdateManyMock.mock.calls[0][0];
    expect(updateManyCall.data).not.toHaveProperty("dailyAttemptCount");
  });
});
