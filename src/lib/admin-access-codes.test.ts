import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { createMock, findManyMock, transactionMock, deleteManyMock, findUniqueMock, countMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findManyMock: vi.fn(),
  transactionMock: vi.fn(),
  deleteManyMock: vi.fn(),
  findUniqueMock: vi.fn(),
  countMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessCode: {
      create: createMock,
      findMany: findManyMock,
      deleteMany: deleteManyMock,
      findUnique: findUniqueMock,
      count: countMock,
    },
    $transaction: transactionMock,
  },
}));

const {
  createAccessCodes,
  deleteAccessCode,
  deleteAccessCodes,
  getAdminAccessCodesPage,
  getAdminAccessCodesForExport,
  parseAdminAccessCodesListQuery,
  MAX_ACCESS_CODES_EXPORT_ROWS,
  AccessCodeGenerationFailedError,
} = await import("./admin-access-codes");

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
  deleteManyMock.mockReset();
  findUniqueMock.mockReset();
  countMock.mockReset();
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

describe("deleteAccessCode", () => {
  it("deletes a code that has no live admission", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteAccessCode("code_1")).resolves.toEqual({ kind: "deleted" });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: "code_1", redeemedByUserId: null },
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("refuses to delete a code that is actively granting access", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });
    findUniqueMock.mockResolvedValue({ id: "code_1" });

    await expect(deleteAccessCode("code_1")).resolves.toEqual({ kind: "activelyRedeemed" });
  });

  it("reports an unknown code as not found rather than actively redeemed", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });
    findUniqueMock.mockResolvedValue(null);

    await expect(deleteAccessCode("missing")).resolves.toEqual({ kind: "notFound" });
  });
});

describe("deleteAccessCodes", () => {
  it("deletes every requested code that has no live admission, in one atomic statement", async () => {
    deleteManyMock.mockResolvedValue({ count: 3 });

    await expect(deleteAccessCodes(["code_1", "code_2", "code_3"])).resolves.toEqual({
      deletedCount: 3,
      requestedCount: 3,
    });
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["code_1", "code_2", "code_3"] }, redeemedByUserId: null },
    });
  });

  it("de-duplicates repeated ids before counting how many were requested", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteAccessCodes(["code_1", "code_1"])).resolves.toEqual({
      deletedCount: 1,
      requestedCount: 1,
    });
  });

  it("reports a partial result when some requested codes are no longer deletable", async () => {
    // e.g. one of the two was redeemed by a learner between page load and
    // this request -- the safety condition on the delete itself excludes it
    // rather than failing the whole batch.
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteAccessCodes(["code_1", "code_2"])).resolves.toEqual({
      deletedCount: 1,
      requestedCount: 2,
    });
  });

  it("does not query the database for an empty selection", async () => {
    await expect(deleteAccessCodes([])).resolves.toEqual({ deletedCount: 0, requestedCount: 0 });
    expect(deleteManyMock).not.toHaveBeenCalled();
  });
});

describe("parseAdminAccessCodesListQuery", () => {
  it("normalizes a search and rejects invalid page values", () => {
    expect(parseAdminAccessCodesListQuery({ query: "  TCF-AB12  ", page: "3" })).toEqual({
      query: "TCF-AB12",
      page: 3,
    });
    expect(parseAdminAccessCodesListQuery({ query: undefined, page: "-7" })).toEqual({
      query: "",
      page: 1,
    });
  });

  it("resolves a duplicated query-string param to its first value, matching URLSearchParams#get", () => {
    // A page's searchParams collapses ?query=a&query=b into ["a", "b"], while
    // an API route's URLSearchParams#get already resolves the same URL to
    // "a" before this parser ever sees it -- both surfaces must agree.
    expect(parseAdminAccessCodesListQuery({ query: ["a", "b"], page: ["2", "9"] })).toEqual({
      query: "a",
      page: 2,
    });
  });
});

describe("getAdminAccessCodesPage", () => {
  beforeEach(() => {
    countMock.mockResolvedValue(0);
    findManyMock.mockResolvedValue([]);
  });

  it("serializes codes with their redeemer's email", async () => {
    countMock.mockResolvedValue(2);
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

    const result = await getAdminAccessCodesPage({ query: "", page: 1 });

    expect(result.accessCodes).toEqual([
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
    expect(result.total).toBe(2);
  });

  it("derives expiresAt from redeemedAt and validityDays for a timed, redeemed code", async () => {
    countMock.mockResolvedValue(1);
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

    const result = await getAdminAccessCodesPage({ query: "", page: 1 });

    expect(result.accessCodes[0].validityDays).toBe(7);
    expect(result.accessCodes[0].expiresAt).toBe("2026-08-17T00:00:00.000Z");
  });

  it("leaves expiresAt null for an unredeemed timed code", async () => {
    countMock.mockResolvedValue(1);
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

    const result = await getAdminAccessCodesPage({ query: "", page: 1 });

    expect(result.accessCodes[0].expiresAt).toBeNull();
  });

  it("paginates past the first page so an older code remains reachable", async () => {
    countMock.mockResolvedValue(120);

    const result = await getAdminAccessCodesPage({ query: "", page: 2 });

    expect(result.pageCount).toBe(3);
    expect(result.page).toBe(2);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 50, take: 50 }),
    );
  });

  it("clamps a page number beyond the last page instead of returning nothing", async () => {
    countMock.mockResolvedValue(10);

    const result = await getAdminAccessCodesPage({ query: "", page: 99 });

    expect(result.page).toBe(1);
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }));
  });

  it("searches by code, note, and redeemer email", async () => {
    await getAdminAccessCodesPage({ query: "learner@example.com", page: 1 });

    expect(countMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { code: { contains: "learner@example.com", mode: "insensitive" } },
          { note: { contains: "learner@example.com", mode: "insensitive" } },
          { redeemedByUser: { email: { contains: "learner@example.com", mode: "insensitive" } } },
        ],
      },
    });
  });
});

describe("getAdminAccessCodesForExport", () => {
  it("returns every matching row when the total is within the export cap", async () => {
    countMock.mockResolvedValue(2);
    findManyMock.mockResolvedValue([
      {
        id: "code_1",
        code: "TCF-AB12-CD34",
        note: null,
        createdAt: new Date("2026-08-10T00:00:00.000Z"),
        redeemedAt: null,
        validityDays: null,
        redeemedByUser: null,
      },
    ]);

    const result = await getAdminAccessCodesForExport("");

    expect(result).toEqual({
      truncated: false,
      accessCodes: [
        {
          id: "code_1",
          code: "TCF-AB12-CD34",
          note: null,
          createdAt: "2026-08-10T00:00:00.000Z",
          redeemedAt: null,
          redeemedByUserEmail: null,
          validityDays: null,
          expiresAt: null,
        },
      ],
    });
  });

  it("refuses instead of silently truncating when the filtered total exceeds the export cap", async () => {
    countMock.mockResolvedValue(MAX_ACCESS_CODES_EXPORT_ROWS + 1);

    const result = await getAdminAccessCodesForExport("");

    expect(result).toEqual({ truncated: true, total: MAX_ACCESS_CODES_EXPORT_ROWS + 1 });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("allows a total exactly at the export cap", async () => {
    countMock.mockResolvedValue(MAX_ACCESS_CODES_EXPORT_ROWS);
    findManyMock.mockResolvedValue([]);

    const result = await getAdminAccessCodesForExport("");

    expect(result.truncated).toBe(false);
  });
});
