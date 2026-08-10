import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAppUserMock, AppUserProvisioningErrorMock, updateMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    updateMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: updateMock } },
}));

const { POST } = await import("./route");

const LOCAL_USER_ID = "cuid_local_user_1";

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  updateMock.mockReset();

  getCurrentAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
  updateMock.mockResolvedValue({ id: LOCAL_USER_ID });
});

describe("POST /api/walkthrough/dismiss", () => {
  it("requires an authenticated learner", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("fails closed while a Clerk identity cannot be safely provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("identity cannot be linked"));

    const response = await POST();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Your account is still being set up. Please try again.",
      code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("records the current walkthrough version for the signed-in learner", async () => {
    const response = await POST();

    expect(response.status).toBe(204);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: LOCAL_USER_ID },
      data: { walkthroughCompletedVersion: 1 },
    });
  });
});
