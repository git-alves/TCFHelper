import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentAppUserMock,
  AppUserProvisioningErrorMock,
  normalizeAccessCodeMock,
  redeemAccessCodeMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    normalizeAccessCodeMock: vi.fn(),
    redeemAccessCodeMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/access-code", () => ({
  normalizeAccessCode: normalizeAccessCodeMock,
  redeemAccessCode: redeemAccessCodeMock,
}));

const { POST } = await import("./route");

const USER_ID = "cuid_learner_1";

function redemptionRequest(body: unknown) {
  return new Request("http://localhost/api/access-codes/redeem", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  normalizeAccessCodeMock.mockReset();
  redeemAccessCodeMock.mockReset();

  getCurrentAppUserMock.mockResolvedValue({ id: USER_ID });
  normalizeAccessCodeMock.mockImplementation((code) => code.trim().toUpperCase());
  redeemAccessCodeMock.mockResolvedValue({ kind: "redeemed" });
});

describe("POST /api/access-codes/redeem", () => {
  it("requires an authenticated learner", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(redeemAccessCodeMock).not.toHaveBeenCalled();
  });

  it("fails closed while the Clerk identity cannot be provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("identity cannot be linked"));

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Your account is still being set up. Please try again.",
      code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
    });
    expect(redeemAccessCodeMock).not.toHaveBeenCalled();
  });

  it("rejects malformed code submissions without attempting redemption", async () => {
    const response = await POST(redemptionRequest({ code: "" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Enter a valid access code.",
      code: "INVALID_ACCESS_CODE",
    });
    expect(redeemAccessCodeMock).not.toHaveBeenCalled();
  });

  it("normalizes and redeems a valid submitted code", async () => {
    const response = await POST(redemptionRequest({ code: " invite-ab12 " }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ activated: true });
    expect(normalizeAccessCodeMock).toHaveBeenCalledWith("invite-ab12");
    expect(redeemAccessCodeMock).toHaveBeenCalledWith(USER_ID, "INVITE-AB12");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not disclose whether an unavailable code is missing or already used", async () => {
    redeemAccessCodeMock.mockResolvedValue({ kind: "invalid" });

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "That access code is invalid or has already been redeemed.",
      code: "ACCESS_CODE_INVALID",
    });
  });

  it("treats an already activated learner as a successful, idempotent submission", async () => {
    redeemAccessCodeMock.mockResolvedValue({ kind: "alreadyActivated" });

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ activated: true });
  });

  it("returns a retryable error when durable redemption fails", async () => {
    redeemAccessCodeMock.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Access-code activation is temporarily unavailable. Please try again.",
      code: "ACCESS_CODE_REDEMPTION_UNAVAILABLE",
    });
  });
});
