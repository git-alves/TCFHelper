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
    accessCode: { findUnique: findUniqueMock, updateMany: updateManyMock },
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
  findUniqueMock.mockImplementation((args: { where: { code?: string } }) =>
    args.where.code ? { id: "access_code_1", validityDays: null } : null,
  );
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
    findUniqueMock.mockResolvedValue({ id: "code_1", redeemedAt: new Date(), validityDays: null, expiresAt: null });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { redeemedByUserId: USER_ID },
      select: { id: true, redeemedAt: true, validityDays: true, expiresAt: true },
    });
  });

  it("returns false before a learner has redeemed a code", async () => {
    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(false);
  });

  it("treats a lifetime code (null expiresAt, null validityDays) as never expiring", async () => {
    findUniqueMock.mockResolvedValue({ id: "code_1", redeemedAt: new Date(), validityDays: null, expiresAt: null });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("derives and self-heals a legacy row's expiry when expiresAt was never persisted (mixed-version rollout gap)", async () => {
    // An app instance that predates the expiresAt column could have written
    // redeemedAt/validityDays without it. Reading such a row must not treat
    // the missing expiresAt as "lifetime" -- it must derive the real expiry
    // and persist it, so this row is never misclassified as live again.
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    findUniqueMock.mockResolvedValueOnce({
      id: "code_legacy",
      redeemedAt: fiveDaysAgo,
      validityDays: 3,
      expiresAt: null,
    });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(false);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "code_legacy", expiresAt: null },
      data: { expiresAt: new Date(fiveDaysAgo.getTime() + 3 * 24 * 60 * 60 * 1000) },
    });
  });

  it("self-heals a legacy row that is still within its derived window without treating it as expired", async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    findUniqueMock.mockResolvedValueOnce({
      id: "code_legacy",
      redeemedAt: oneDayAgo,
      validityDays: 7,
      expiresAt: null,
    });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "code_legacy", expiresAt: null },
      data: { expiresAt: new Date(oneDayAgo.getTime() + 7 * 24 * 60 * 60 * 1000) },
    });
  });

  it("treats a timed code still inside its window as active", async () => {
    const fiveDaysFromNow = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    findUniqueMock.mockResolvedValue({ expiresAt: fiveDaysFromNow });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("detaches and reports false once a timed code's window has elapsed", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    // The first findUnique is hasRedeemedAccessCode's own unlocked read; the
    // second is resolveAdmissionLocked's re-read of the same still-current,
    // still-expired admission once the per-user lock is held.
    findUniqueMock
      .mockResolvedValueOnce({ expiresAt: threeDaysAgo })
      .mockResolvedValueOnce({ id: "code_expired", expiresAt: threeDaysAgo });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(false);
    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "code_expired", redeemedByUserId: USER_ID, redeemedAt: { not: null } },
      data: { redeemedByUserId: null },
    });
  });

  it("does not detach a replacement code redeemed between the unlocked read and the lock", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    // The unlocked read still sees the old expired code, but by the time the
    // lock is held a fresh, non-expired replacement is current -- the exact
    // race Chef's review flagged. The stale detach must not touch it.
    findUniqueMock
      .mockResolvedValueOnce({ expiresAt: threeDaysAgo })
      .mockResolvedValueOnce({ id: "code_replacement", expiresAt: thirtyDaysFromNow });

    await expect(hasRedeemedAccessCode(USER_ID)).resolves.toBe(true);
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});

describe("redeemAccessCode", () => {
  it("claims an unused code inside a serialized transaction", async () => {
    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({
      kind: "redeemed",
      showWelcome: true,
      accessCodeId: "access_code_1",
    });

    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { redeemedByUserId: USER_ID },
      select: { id: true, redeemedAt: true, validityDays: true, expiresAt: true },
    });
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { code: "INVITE-AB12" },
      select: { id: true, validityDays: true },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "access_code_1", redeemedByUserId: null, redeemedAt: null },
      data: {
        redeemedByUserId: USER_ID,
        redeemedAt: expect.any(Date),
        expiresAt: null,
      },
    });
    expect(userUpdateManyMock).toHaveBeenCalledWith({
      where: { id: USER_ID, activationWelcomeShownAt: null },
      data: { activationWelcomeShownAt: expect.any(Date) },
    });
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), { timeout: 3_000 });
  });

  it("computes expiresAt from the candidate code's validityDays at the moment of redemption", async () => {
    findUniqueMock.mockImplementation((args: { where: { code?: string } }) =>
      args.where.code ? { id: "access_code_1", validityDays: 7 } : null,
    );

    const before = Date.now();
    await redeemAccessCode(USER_ID, "TIMED-CODE");
    const after = Date.now();

    const call = updateManyMock.mock.calls[0]?.[0] as { data: { expiresAt: Date } };
    const expiresAtMs = call.data.expiresAt.getTime();
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + 7 * 24 * 60 * 60 * 1000);
    expect(expiresAtMs).toBeLessThanOrEqual(after + 7 * 24 * 60 * 60 * 1000);
  });

  it("does not spend a second code for a learner who is already activated", async () => {
    findUniqueMock.mockResolvedValue({
      id: "code_already_used",
      redeemedAt: new Date(),
      validityDays: null,
      expiresAt: null,
    });

    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({
      kind: "alreadyActivated",
    });
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("detaches an expired admission and claims the replacement code in the same transaction", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    findUniqueMock
      .mockResolvedValueOnce({ id: "code_expired", expiresAt: threeDaysAgo })
      .mockResolvedValueOnce({ id: "replacement_code", validityDays: null });
    // The original (now-expired) redemption already set this marker, so a
    // replacement code's own redemption must not re-trigger the welcome.
    userUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "NEW-CODE")).resolves.toEqual({
      kind: "redeemed",
      showWelcome: false,
      accessCodeId: "replacement_code",
    });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "code_expired", redeemedByUserId: USER_ID, redeemedAt: { not: null } },
      data: { redeemedByUserId: null },
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "replacement_code", redeemedByUserId: null, redeemedAt: null },
      data: { redeemedByUserId: USER_ID, redeemedAt: expect.any(Date), expiresAt: null },
    });
  });

  it("does not reveal whether an unavailable code is missing or already redeemed", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "INVITE-AB12")).resolves.toEqual({ kind: "invalid" });
    expect(userUpdateManyMock).not.toHaveBeenCalled();
  });

  it("reports invalid without attempting a claim when the code does not exist at all", async () => {
    findUniqueMock.mockImplementation((args: { where: { code?: string } }) => (args.where.code ? null : null));

    await expect(redeemAccessCode(USER_ID, "NO-SUCH-CODE")).resolves.toEqual({ kind: "invalid" });
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("does not repeat the welcome handoff for a restored learner", async () => {
    userUpdateManyMock.mockResolvedValue({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "NEW-INVITE")).resolves.toEqual({
      kind: "redeemed",
      showWelcome: false,
      accessCodeId: "access_code_1",
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
    // 1) resetAccessCodeActivation's own lookup for the learner's current admission.
    findUniqueMock.mockResolvedValueOnce({ id: "old_code" });
    updateManyMock.mockResolvedValueOnce({ count: 1 });
    userUpdateManyMock.mockResolvedValueOnce({ count: 1 });

    await expect(resetAccessCodeActivation(USER_ID)).resolves.toEqual({ kind: "reset" });

    // 2) redeemAccessCode(OLD-CODE): no current admission, and the candidate
    // row exists but is permanently spent (redeemedAt already set), so the
    // conditional claim below matches nothing.
    findUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "old_code", validityDays: null });
    updateManyMock.mockResolvedValueOnce({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "OLD-CODE")).resolves.toEqual({ kind: "invalid" });

    // 3) redeemAccessCode(NEW-CODE): a fresh, unredeemed code claims successfully.
    findUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "new_code", validityDays: null });
    updateManyMock.mockResolvedValueOnce({ count: 1 });
    userUpdateManyMock.mockResolvedValueOnce({ count: 0 });

    await expect(redeemAccessCode(USER_ID, "NEW-CODE")).resolves.toEqual({
      kind: "redeemed",
      showWelcome: false,
      accessCodeId: "new_code",
    });

    expect(updateManyMock).toHaveBeenNthCalledWith(2, {
      where: { id: "old_code", redeemedByUserId: null, redeemedAt: null },
      data: { redeemedByUserId: USER_ID, redeemedAt: expect.any(Date), expiresAt: null },
    });
    expect(updateManyMock).toHaveBeenNthCalledWith(3, {
      where: { id: "new_code", redeemedByUserId: null, redeemedAt: null },
      data: { redeemedByUserId: USER_ID, redeemedAt: expect.any(Date), expiresAt: null },
    });
  });
});
