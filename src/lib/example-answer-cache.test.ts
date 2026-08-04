import { beforeEach, describe, expect, it, vi } from "vitest";

const { transactionMock, leaseFindMock, answerUpsertMock, leaseDeleteMock, topLevelLeaseDeleteMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  leaseFindMock: vi.fn(),
  answerUpsertMock: vi.fn(),
  leaseDeleteMock: vi.fn(),
  topLevelLeaseDeleteMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    exampleGenerationLease: { deleteMany: topLevelLeaseDeleteMock },
  },
}));

import { cacheExample, releaseExampleGenerationLease } from "./example-answer-cache";

const cacheKey = ["learner_1", "TASK_2", "B2" as const, "topic_hash"] as const;

beforeEach(() => {
  transactionMock.mockReset();
  leaseFindMock.mockReset();
  answerUpsertMock.mockReset();
  leaseDeleteMock.mockReset();
  topLevelLeaseDeleteMock.mockReset();
  transactionMock.mockImplementation((callback) =>
    callback({
      $executeRaw: vi.fn(),
      exampleGenerationLease: { findUnique: leaseFindMock, deleteMany: leaseDeleteMock },
      exampleAnswer: { upsert: answerUpsertMock },
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

  it("releases only the lease held by the request that failed", async () => {
    await releaseExampleGenerationLease(...cacheKey, "owner_1");

    expect(topLevelLeaseDeleteMock).toHaveBeenCalledWith({
      where: {
        userId: "learner_1",
        taskType: "TASK_2",
        level: "B2",
        topicHash: "topic_hash",
        claimToken: "owner_1",
      },
    });
  });
});
