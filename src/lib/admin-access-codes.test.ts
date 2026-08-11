import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { createMock, findManyMock, transactionMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessCode: { create: createMock, findMany: findManyMock },
    $transaction: transactionMock,
  },
}));

const { createAccessCodes, listAccessCodes, AccessCodeGenerationFailedError } = await import(
  "./admin-access-codes"
);

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  createMock.mockReset();
  findManyMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation(async (callback) => callback({ accessCode: { create: createMock } }));
});

describe("createAccessCodes", () => {
  it("creates an 80-bit TCF-XXXX-XXXX-XXXX-XXXX code with a trimmed note", async () => {
    createMock.mockResolvedValue({
      id: "code_1",
      code: "TCF-AB12-CD34",
      note: "for beta cohort",
      createdAt: new Date("2026-08-10T00:00:00.000Z"),
      redeemedAt: null,
      validityDays: null,
    });

    const result = await createAccessCodes("  for beta cohort  ", null, 1);

    expect(result).toEqual([
      {
        id: "code_1",
        code: "TCF-AB12-CD34",
        note: "for beta cohort",
        createdAt: "2026-08-10T00:00:00.000Z",
        redeemedAt: null,
        redeemedByUserEmail: null,
        validityDays: null,
        expiresAt: null,
      },
    ]);
    expect(createMock).toHaveBeenCalledTimes(1);
    const createdData = createMock.mock.calls[0][0].data;
    expect(createdData.code).toMatch(/^TCF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("stores a null note when none is given", async () => {
    createMock.mockResolvedValue({
      id: "code_1",
      code: "TCF-AB12-CD34",
      note: null,
      createdAt: new Date(),
      redeemedAt: null,
      validityDays: null,
    });

    await createAccessCodes(null, null, 1);

    expect(createMock.mock.calls[0][0].data.note).toBeNull();
  });

  it("stores the requested validity period on every created code", async () => {
    createMock.mockResolvedValue({
      id: "code_1",
      code: "TCF-AB12-CD34",
      note: null,
      createdAt: new Date(),
      redeemedAt: null,
      validityDays: 14,
    });

    const result = await createAccessCodes(null, 14, 1);

    expect(createMock.mock.calls[0][0].data.validityDays).toBe(14);
    expect(result[0].validityDays).toBe(14);
  });

  it("generates the requested number of codes sharing the same note and validity", async () => {
    let sequence = 0;
    createMock.mockImplementation(async () => {
      sequence += 1;
      return {
        id: `code_${sequence}`,
        code: `TCF-000${sequence}-CD34`,
        note: "cohort",
        createdAt: new Date(),
        redeemedAt: null,
        validityDays: 7,
      };
    });

    const result = await createAccessCodes("cohort", 7, 3);

    expect(result).toHaveLength(3);
    expect(new Set(result.map((code) => code.id)).size).toBe(3);
    expect(createMock).toHaveBeenCalledTimes(3);
    for (const call of createMock.mock.calls) {
      expect(call[0].data.note).toBe("cohort");
      expect(call[0].data.validityDays).toBe(7);
    }
  });

  it("wraps a whole batch in a single transaction rather than one per code", async () => {
    let sequence = 0;
    createMock.mockImplementation(async () => {
      sequence += 1;
      return {
        id: `code_${sequence}`,
        code: `TCF-000${sequence}-CD34`,
        note: null,
        createdAt: new Date(),
        redeemedAt: null,
        validityDays: null,
      };
    });

    await createAccessCodes(null, null, 5);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledTimes(5);
  });

  it("retries the whole batch, not a doomed statement inside one transaction, after a mid-batch collision", async () => {
    // PostgreSQL marks an interactive transaction aborted after a unique
    // violation: every later statement in that same transaction fails too,
    // even a well-formed retry with a fresh candidate code. So the first
    // (aborted) attempt's surviving code must never appear in the result --
    // only a subsequent, fully-fresh transaction attempt can succeed.
    let transactionAttempt = 0;
    let insertInAttempt = 0;
    createMock.mockImplementation(async () => {
      insertInAttempt += 1;
      if (transactionAttempt === 1 && insertInAttempt === 2) {
        throw uniqueConstraintError();
      }
      return {
        id: `attempt${transactionAttempt}_code${insertInAttempt}`,
        code: `TCF-${transactionAttempt}${insertInAttempt}`,
        note: null,
        createdAt: new Date(),
        redeemedAt: null,
        validityDays: null,
      };
    });
    transactionMock.mockImplementation(async (callback) => {
      transactionAttempt += 1;
      insertInAttempt = 0;
      return callback({ accessCode: { create: createMock } });
    });

    const result = await createAccessCodes(null, null, 2);

    expect(result).toHaveLength(2);
    expect(result.every((code) => code.id.startsWith("attempt2_"))).toBe(true);
    expect(transactionMock).toHaveBeenCalledTimes(2);
  });

  it("retries on a code collision instead of surfacing the constraint error", async () => {
    createMock
      .mockRejectedValueOnce(uniqueConstraintError())
      .mockRejectedValueOnce(uniqueConstraintError())
      .mockResolvedValueOnce({
        id: "code_3",
        code: "TCF-EF56-GH78",
        note: null,
        createdAt: new Date(),
        redeemedAt: null,
        validityDays: null,
      });

    const result = await createAccessCodes(null, null, 1);

    expect(result[0].code).toBe("TCF-EF56-GH78");
    // Each attempt is its own fresh transaction (see the mid-batch test
    // above for why retrying inside one transaction cannot work).
    expect(transactionMock).toHaveBeenCalledTimes(3);
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after repeated collisions instead of looping forever", async () => {
    createMock.mockRejectedValue(uniqueConstraintError());

    await expect(createAccessCodes(null, null, 1)).rejects.toBeInstanceOf(AccessCodeGenerationFailedError);
  });

  it("does not retry a non-collision error", async () => {
    const dbError = new Error("connection lost");
    createMock.mockRejectedValue(dbError);

    await expect(createAccessCodes(null, null, 1)).rejects.toBe(dbError);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});

describe("listAccessCodes", () => {
  it("serializes codes with their redeemer's email", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "code_1",
        code: "TCF-AB12-CD34",
        note: "batch 1",
        createdAt: new Date("2026-08-10T00:00:00.000Z"),
        redeemedAt: new Date("2026-08-11T00:00:00.000Z"),
        validityDays: null,
        redeemedByUser: { email: "learner@example.com" },
      },
      {
        id: "code_2",
        code: "TCF-EF56-GH78",
        note: null,
        createdAt: new Date("2026-08-09T00:00:00.000Z"),
        redeemedAt: null,
        validityDays: null,
        redeemedByUser: null,
      },
    ]);

    const codes = await listAccessCodes();

    expect(codes).toEqual([
      {
        id: "code_1",
        code: "TCF-AB12-CD34",
        note: "batch 1",
        createdAt: "2026-08-10T00:00:00.000Z",
        redeemedAt: "2026-08-11T00:00:00.000Z",
        redeemedByUserEmail: "learner@example.com",
        validityDays: null,
        expiresAt: null,
      },
      {
        id: "code_2",
        code: "TCF-EF56-GH78",
        note: null,
        createdAt: "2026-08-09T00:00:00.000Z",
        redeemedAt: null,
        redeemedByUserEmail: null,
        validityDays: null,
        expiresAt: null,
      },
    ]);
  });

  it("derives expiresAt from redeemedAt and validityDays for a timed, redeemed code", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "code_1",
        code: "TCF-AB12-CD34",
        note: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        redeemedAt: new Date("2026-08-10T00:00:00.000Z"),
        validityDays: 7,
        redeemedByUser: { email: "learner@example.com" },
      },
    ]);

    const codes = await listAccessCodes();

    expect(codes[0].validityDays).toBe(7);
    expect(codes[0].expiresAt).toBe("2026-08-17T00:00:00.000Z");
  });

  it("leaves expiresAt null for an unredeemed timed code", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "code_1",
        code: "TCF-AB12-CD34",
        note: null,
        createdAt: new Date("2026-08-01T00:00:00.000Z"),
        redeemedAt: null,
        validityDays: 7,
        redeemedByUser: null,
      },
    ]);

    const codes = await listAccessCodes();

    expect(codes[0].expiresAt).toBeNull();
  });
});
