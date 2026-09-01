import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentAppUserMock,
  AppUserProvisioningErrorMock,
  normalizeAccessCodeMock,
  redeemAccessCodeMock,
  recordAdminEventMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    normalizeAccessCodeMock: vi.fn(),
    redeemAccessCodeMock: vi.fn(),
    recordAdminEventMock: vi.fn(),
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
vi.mock("@/lib/admin-events", () => ({ recordAdminEvent: recordAdminEventMock }));

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
  recordAdminEventMock.mockReset();

  getCurrentAppUserMock.mockResolvedValue({ id: USER_ID, walkthroughCompletedVersion: null });
  normalizeAccessCodeMock.mockImplementation((code) => code.trim().toUpperCase());
  redeemAccessCodeMock.mockResolvedValue({ kind: "redeemed", showWelcome: true, accessCodeId: "access_code_1" });
});

describe("POST /api/access-codes/redeem", () => {
  it("requires an authenticated learner", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(redeemAccessCodeMock).not.toHaveBeenCalled();
  });

  it("does not consume a code for the activation-exempt owner", async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: "owner_1", isAdmin: true });

    const response = await POST(redemptionRequest({ code: "TCF-AB12-CD34-EF56-GH78" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ activated: true, showWelcome: false });
    expect(normalizeAccessCodeMock).not.toHaveBeenCalled();
    expect(redeemAccessCodeMock).not.toHaveBeenCalled();
    expect(recordAdminEventMock).not.toHaveBeenCalled();
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
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "ACCESS_CODE_REJECTED",
      userId: USER_ID,
      reasonCode: "invalid_or_spent",
      httpStatus: 400,
    });
  });

  it("normalizes and redeems a valid submitted code", async () => {
    const response = await POST(redemptionRequest({ code: " invite-ab12 " }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activated: true,
      showWelcome: true,
      welcomeDestination: "/dashboard",
    });
    expect(normalizeAccessCodeMock).toHaveBeenCalledWith("invite-ab12");
    expect(redeemAccessCodeMock).toHaveBeenCalledWith(USER_ID, "INVITE-AB12");
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "ACCESS_CODE_REDEEMED",
      userId: USER_ID,
      accessCodeId: "access_code_1",
      httpStatus: 200,
    });
    expect(JSON.stringify(recordAdminEventMock.mock.calls)).not.toContain("INVITE-AB12");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not repeat the welcome handoff after a learner's access is restored", async () => {
    redeemAccessCodeMock.mockResolvedValue({ kind: "redeemed", showWelcome: false, accessCodeId: "access_code_1" });

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ activated: true, showWelcome: false });
  });

  it("restarts the welcome at dashboard for a learner below the current walkthrough version", async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: USER_ID, walkthroughCompletedVersion: 1 });

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activated: true,
      showWelcome: true,
      welcomeDestination: "/dashboard",
    });
  });

  it("sends a learner below the current walkthrough version to dashboard", async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: USER_ID, walkthroughCompletedVersion: 0 });

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      activated: true,
      showWelcome: true,
      welcomeDestination: "/dashboard",
    });
  });

  it("does not disclose whether an unavailable code is missing or already used", async () => {
    redeemAccessCodeMock.mockResolvedValue({ kind: "invalid" });

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "That access code is invalid or has already been redeemed.",
      code: "ACCESS_CODE_INVALID",
    });
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "ACCESS_CODE_REJECTED",
      userId: USER_ID,
      reasonCode: "invalid_or_spent",
      httpStatus: 400,
    });
    expect(JSON.stringify(recordAdminEventMock.mock.calls)).not.toContain("INVITE-AB12");
  });

  it("treats an already activated learner as a successful, idempotent submission", async () => {
    redeemAccessCodeMock.mockResolvedValue({ kind: "alreadyActivated" });

    const response = await POST(redemptionRequest({ code: "INVITE-AB12" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ activated: true, showWelcome: false });
    expect(recordAdminEventMock).not.toHaveBeenCalled();
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
