import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  findUniqueMock,
  updateManyMock,
  executeRawMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateManyMock: vi.fn(),
  executeRawMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    accessCode: { findUnique: findUniqueMock },
  },
}));

const { hasRedeemedAccessCode, normalizeAccessCode, redeemAccessCode } = await import("./access-code");

const USER_ID = "cuid_learner_1";

beforeEach(() => {
  transactionMock.mockReset();
  findUniqueMock.mockReset();
  updateManyMock.mockReset();
  executeRawMock.mockReset();

  executeRawMock.mockResolvedValue(1);
  findUniqueMock.mockResolvedValue(null);
  updateManyMock.mockResolvedValue({ count: 1 });
  transactionMock.mockImplementation(async (callback) =>
    callback({
      $executeRaw: executeRawMock,
      accessCode: {
        findUnique: findUniqueMock,
        updateMany: updateManyMock,
      },
    }),
  );
});

describe("normalizeAccessCode", () => {
  it("trims and uppercases a pasted code without changing its readable separators", () => {
    expect(normalizeAccessCode("  invite-ab12  ")).toBe("INVITE-AB12");
  });
});

describe("hasRedeemedAccessCode", () => {
  it("looks up the code redeemed by this learner", async () => {
    findUniqueMock.mockResolvedValue({ id: "code_1" });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { redeemedByUserId: USER_ID },
      select: { id: true },
    });
  });

  it("returns false before a learner has redeemed a code", async () => {
    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(false);
  });
});

describe("redeemAccessCode", () => {
  it("claims an unused code inside a serialized transaction", async () => {
    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({ kind: "redeemed" });

    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { redeemedByUserId: USER_ID },
      select: { id: true },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { code: "INVITE-AB12", redeemedByUserId: null, redeemedAt: null },
      data: {
        redeemedByUserId: USER_ID,
        redeemedAt: expect.any(Date),
      },
    });
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), { timeout: 3_000 });
  });

  it("does not spend a second code for a learner who is already activated", async () => {
    findUniqueMock.mockResolvedValue({ id: "code_already_used" });

    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({
      kind: "alreadyActivated",
    });
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("does not reveal whether an unavailable code is missing or already redeemed", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({ kind: "invalid" });
  });
});
