import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  executeRawMock,
  essayFindFirstMock,
  leaseFindUniqueMock,
  leaseUpsertMock,
  leaseDeleteManyMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  executeRawMock: vi.fn(),
  essayFindFirstMock: vi.fn(),
  leaseFindUniqueMock: vi.fn(),
  leaseUpsertMock: vi.fn(),
  leaseDeleteManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));
vi.mock("server-only", () => ({}));

const {
  claimCorrection,
  completeCorrectionClaim,
  hashCorrectionKey,
  releaseCorrectionClaim,
} = await import("./correction-claim");

const input = {
  userId: "learner_1",
  correctionKey: '{"version":1,"taskType":"TASK_1","topic":{"kind":"custom","value":"Écrivez."},"content":"Bonjour."}',
  taskType: "TASK_1" as const,
  content: "Bonjour.",
  topic: { kind: "custom" as const, prompt: "Écrivez." },
};

const now = new Date("2026-08-07T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  transactionMock.mockReset();
  executeRawMock.mockReset();
  essayFindFirstMock.mockReset();
  leaseFindUniqueMock.mockReset();
  leaseUpsertMock.mockReset();
  leaseDeleteManyMock.mockReset();

  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      $executeRaw: executeRawMock,
      essay: { findFirst: essayFindFirstMock },
      correctionLease: {
        findUnique: leaseFindUniqueMock,
        upsert: leaseUpsertMock,
        deleteMany: leaseDeleteManyMock,
      },
    }),
  );
  essayFindFirstMock.mockResolvedValue(null);
  leaseFindUniqueMock.mockResolvedValue(null);
  leaseUpsertMock.mockResolvedValue(undefined);
  leaseDeleteManyMock.mockResolvedValue({ count: 1 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("hashCorrectionKey", () => {
  it("is stable for one correction context and changes when that context changes", () => {
    expect(hashCorrectionKey(input.correctionKey)).toBe(hashCorrectionKey(input.correctionKey));
    expect(hashCorrectionKey(input.correctionKey)).not.toBe(hashCorrectionKey(`${input.correctionKey}!`));
  });
});

describe("claimCorrection", () => {
  it("returns an existing correction through the hash-or-exact-legacy lookup without creating a lease", async () => {
    essayFindFirstMock.mockResolvedValue({ id: "essay_existing" });

    await expect(claimCorrection(input)).resolves.toEqual({
      kind: "existing",
      essayId: "essay_existing",
      correctionKeyHash: hashCorrectionKey(input.correctionKey),
    });

    expect(essayFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: input.userId,
          OR: expect.arrayContaining([
            { correctionKeyHash: hashCorrectionKey(input.correctionKey) },
            {
              correctionKeyHash: null,
              taskType: input.taskType,
              content: input.content,
              topic: { is: { source: "USER_SUBMITTED", prompt: input.topic.prompt } },
            },
          ]),
        }),
      }),
    );
    expect(leaseFindUniqueMock).not.toHaveBeenCalled();
    expect(leaseUpsertMock).not.toHaveBeenCalled();
  });

  it("uses a matching shared topic ID for legacy exact-content fallback", async () => {
    const sharedInput = {
      ...input,
      correctionKey: "shared-key",
      topic: { kind: "shared" as const, id: "topic_1" },
    };
    essayFindFirstMock.mockResolvedValue({ id: "essay_existing" });

    await claimCorrection(sharedInput);

    expect(essayFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            {
              correctionKeyHash: null,
              taskType: input.taskType,
              content: input.content,
              topicId: "topic_1",
            },
          ]),
        }),
      }),
    );
  });

  it("returns in-progress without issuing a second provider claim while a lease is live", async () => {
    const retryAt = new Date(now.getTime() + 30_000);
    leaseFindUniqueMock.mockResolvedValue({ expiresAt: retryAt });

    await expect(claimCorrection(input)).resolves.toEqual({
      kind: "inProgress",
      retryAt,
      correctionKeyHash: hashCorrectionKey(input.correctionKey),
    });

    expect(leaseUpsertMock).not.toHaveBeenCalled();
  });

  it("reclaims an expired lease with a fresh owner token", async () => {
    leaseFindUniqueMock.mockResolvedValue({ expiresAt: new Date(now.getTime() - 1) });

    const result = await claimCorrection(input);

    expect(result.kind).toBe("claimed");
    if (result.kind !== "claimed") return;
    expect(result.claimToken).toEqual(expect.any(String));
    expect(leaseUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: input.userId,
          correctionKeyHash: hashCorrectionKey(input.correctionKey),
          claimToken: result.claimToken,
          expiresAt: new Date(now.getTime() + 75_000),
        }),
        update: expect.objectContaining({ claimToken: result.claimToken }),
      }),
    );
  });
});

describe("completeCorrectionClaim", () => {
  it("persists and clears the lease only for the owning claim", async () => {
    const correctionKeyHash = hashCorrectionKey(input.correctionKey);
    leaseFindUniqueMock.mockResolvedValue({
      claimToken: "owner_1",
      expiresAt: new Date(now.getTime() + 30_000),
    });
    const persist = vi.fn().mockResolvedValue({ id: "essay_saved" });

    await expect(
      completeCorrectionClaim({
        ...input,
        correctionKeyHash,
        claimToken: "owner_1",
        persist,
      }),
    ).resolves.toEqual({ kind: "completed", value: { id: "essay_saved" } });

    expect(persist).toHaveBeenCalledTimes(1);
    expect(leaseDeleteManyMock).toHaveBeenCalledWith({
      where: {
        userId: input.userId,
        correctionKeyHash,
        claimToken: "owner_1",
      },
    });
  });

  it("does not let a stale owner persist or delete a newer claim", async () => {
    const correctionKeyHash = hashCorrectionKey(input.correctionKey);
    const retryAt = new Date(now.getTime() + 30_000);
    leaseFindUniqueMock.mockResolvedValue({ claimToken: "new_owner", expiresAt: retryAt });
    const persist = vi.fn();

    await expect(
      completeCorrectionClaim({
        ...input,
        correctionKeyHash,
        claimToken: "old_owner",
        persist,
      }),
    ).resolves.toEqual({ kind: "inProgress", retryAt });

    expect(persist).not.toHaveBeenCalled();
    expect(leaseDeleteManyMock).not.toHaveBeenCalled();
  });

  it("does not let an expired owner persist after its lease has timed out", async () => {
    const correctionKeyHash = hashCorrectionKey(input.correctionKey);
    leaseFindUniqueMock.mockResolvedValue({
      claimToken: "owner_1",
      expiresAt: new Date(now.getTime() - 1),
    });
    const persist = vi.fn();

    await expect(
      completeCorrectionClaim({
        ...input,
        correctionKeyHash,
        claimToken: "owner_1",
        persist,
      }),
    ).resolves.toEqual({ kind: "lost" });

    expect(persist).not.toHaveBeenCalled();
    expect(leaseDeleteManyMock).not.toHaveBeenCalled();
  });

  it("does not persist an owner whose lease has already expired", async () => {
    const correctionKeyHash = hashCorrectionKey(input.correctionKey);
    leaseFindUniqueMock.mockResolvedValue({
      claimToken: "owner_1",
      expiresAt: new Date(now.getTime() - 1),
    });
    const persist = vi.fn();

    await expect(
      completeCorrectionClaim({
        ...input,
        correctionKeyHash,
        claimToken: "owner_1",
        persist,
      }),
    ).resolves.toEqual({ kind: "lost" });

    expect(persist).not.toHaveBeenCalled();
    expect(leaseDeleteManyMock).not.toHaveBeenCalled();
  });
});

describe("releaseCorrectionClaim", () => {
  it("only releases the exact failed claim token", async () => {
    const correctionKeyHash = hashCorrectionKey(input.correctionKey);

    await releaseCorrectionClaim({
      userId: input.userId,
      correctionKeyHash,
      claimToken: "owner_1",
    });

    expect(leaseDeleteManyMock).toHaveBeenCalledWith({
      where: { userId: input.userId, correctionKeyHash, claimToken: "owner_1" },
    });
  });
});
