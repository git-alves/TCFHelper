import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  findUniqueMock,
  updateManyMock,
  userUpdateManyMock,
  executeRawMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateManyMock: vi.fn(),
  userUpdateManyMock: vi.fn(),
  executeRawMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    accessCode: { findUnique: findUniqueMock },
  },
}));

const {
  hasRedeemedAccessCode,
  normalizeAccessCode,
  redeemAccessCode,
  resetAccessCodeActivation,
} = await import("./access-code");

const USER_ID = "cuid_learner_1";

beforeEach(() => {
  transactionMock.mockReset();
  findUniqueMock.mockReset();
  updateManyMock.mockReset();
  userUpdateManyMock.mockReset();
  executeRawMock.mockReset();

  executeRawMock.mockResolvedValue(1);
  findUniqueMock.mockResolvedValue(null);
  updateManyMock.mockResolvedValue({ count: 1 });
  userUpdateManyMock.mockResolvedValue({ count: 1 });
  transactionMock.mockImplementation(async (callback) =>
    callback({
      $executeRaw: executeRawMock,
      accessCode: {
        findUnique: findUniqueMock,
        updateMany: updateManyMock,
      },
      user: { updateMany: userUpdateManyMock },
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
    findUniqueMock.mockResolvedValue({ redeemedAt: new Date(), validityDays: null });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { redeemedByUserId: USER_ID },
      select: { redeemedAt: true, validityDays: true },
    });
  });

  it("returns false before a learner has redeemed a code", async () => {
    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(false);
  });

  it("treats a lifetime code (null validityDays) as never expiring", async () => {
    const longAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    findUniqueMock.mockResolvedValue({ redeemedAt: longAgo, validityDays: null });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("treats a timed code still inside its window as active", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    findUniqueMock.mockResolvedValue({ redeemedAt: twoDaysAgo, validityDays: 7 });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("detaches and reports false once a timed code's window has elapsed", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    // The first findUnique is hasRedeemedAccessCode's own unlocked read; the
    // second is resolveAdmissionLocked's re-read of the same still-current,
    // still-expired admission once the per-user lock is held.
    findUniqueMock
      .mockResolvedValueOnce({ redeemedAt: tenDaysAgo, validityDays: 7 })
      .mockResolvedValueOnce({ id: "code_expired", redeemedAt: tenDaysAgo, validityDays: 7 });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(false);
    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "code_expired", redeemedByUserId: USER_ID, redeemedAt: { not: null } },
      data: { redeemedByUserId: null },
    });
  });

  it("does not detach a replacement code redeemed between the unlocked read and the lock", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const justNow = new Date();
    // The unlocked read still sees the old expired code, but by the time the
    // lock is held a fresh, non-expired replacement is current -- the exact
    // race Chef's review flagged. The stale detach must not touch it.
    findUniqueMock
      .mockResolvedValueOnce({ redeemedAt: tenDaysAgo, validityDays: 7 })
      .mockResolvedValueOnce({ id: "code_replacement", redeemedAt: justNow, validityDays: 30 });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});

describe("redeemAccessCode", () => {
  it("claims an unused code inside a serialized transaction", async () => {
    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({
      kind: "redeemed",
      showWelcome: true,
    });

    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { redeemedByUserId: USER_ID },
      select: { id: true, redeemedAt: true, validityDays: true },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { code: "INVITE-AB12", redeemedByUserId: null, redeemedAt: null },
      data: {
        redeemedByUserId: USER_ID,
        redeemedAt: expect.any(Date),
      },
    });
    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: USER_ID, activationWelcomeShownAt: null },
      data: { activationWelcomeShownAt: expect.any(Date) },
    });
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), { timeout: 3_000 });
  });

  it("does not spend a second code for a learner who is already activated", async () => {
    findUniqueMock.mockResolvedValue({ id: "code_already_used", redeemedAt: new Date(), validityDays: null });

    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({
      kind: "alreadyActivated",
    });
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("detaches an expired admission and claims the replacement code in the same transaction", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    findUniqueMock.mockResolvedValue({ id: "code_expired", redeemedAt: tenDaysAgo, validityDays: 7 });
    // The original (now-expired) redemption already set this marker, so a
    // replacement code's own redemption must not re-trigger the welcome.
    userUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "NEW-CODE")).resolves.toEqual({
      kind: "redeemed",
      showWelcome: false,
    });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "code_expired", redeemedByUserId: USER_ID, redeemedAt: { not: null } },
      data: { redeemedByUserId: null },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { code: "NEW-CODE", redeemedByUserId: null, redeemedAt: null },
      data: { redeemedByUserId: USER_ID, redeemedAt: expect.any(Date) },
    });
  });

  it("does not reveal whether an unavailable code is missing or already redeemed", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({ kind: "invalid" });
    expect(userUpdateManyMock).not.toHaveBeenCalled();
  });

  it("does not repeat the welcome handoff for a restored learner", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "NEW-INVITE")).resolves.toEqual({
      kind: "redeemed",
      showWelcome: false,
    });
  });
});

describe("resetAccessCodeActivation", () => {
  it("serializes with redemption and detaches only the active admission", async () => {
    findUniqueMock.mockResolvedValue({ id: "code_spent" });

    await expect(resetAccessCodeActivation(USER_ID)).resolves.toEqual({ kind: "reset" });

    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { redeemedByUserId: USER_ID },
      select: { id: true },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: "code_spent",
        redeemedByUserId: USER_ID,
        redeemedAt: { not: null },
      },
      data: { redeemedByUserId: null },
    });
    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: USER_ID, activationWelcomeShownAt: null },
      data: { activationWelcomeShownAt: expect.any(Date) },
    });
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), { timeout: 3_000 });
  });

  it("is idempotent when the learner is already awaiting a new code", async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(resetAccessCodeActivation(USER_ID)).resolves.toEqual({ kind: "notActivated" });
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("keeps the old code permanently unavailable while a newly issued code can activate", async () => {
    findUniqueMock
      .mockResolvedValueOnce({ id: "old_code" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    updateManyMock
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    userUpdateManyMock
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(resetAccessCodeActivation(USER_ID)).resolves.toEqual({ kind: "reset" });
    await expect(redeemAccessCode(USER_ID, "OLD-CODE")).resolves.toEqual({ kind: "invalid" });
    await expect(redeemAccessCode(USER_ID, "NEW-CODE")).resolves.toEqual({
      kind: "redeemed",
      showWelcome: false,
    });

    expect(updateManyMock).toHaveBeenNthCalledWith(2, {
      where: { code: "OLD-CODE", redeemedByUserId: null, redeemedAt: null },
      data: { redeemedByUserId: USER_ID, redeemedAt: expect.any(Date) },
    });
    expect(updateManyMock).toHaveBeenNthCalledWith(3, {
      where: { code: "NEW-CODE", redeemedByUserId: null, redeemedAt: null },
      data: { redeemedByUserId: USER_ID, redeemedAt: expect.any(Date) },
    });
  });
});
