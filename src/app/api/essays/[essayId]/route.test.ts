import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, deleteCorrectionForUserMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    deleteCorrectionForUserMock: vi.fn(),
  };
});

vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/correction-history", () => ({
  deleteCorrectionForUser: deleteCorrectionForUserMock,
}));

const { DELETE } = await import("./route");

const LOCAL_USER_ID = "cuid_local_user_1";

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  deleteCorrectionForUserMock.mockReset();

  getCurrentActivatedAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
  deleteCorrectionForUserMock.mockResolvedValue(true);
});

function del(essayId: string) {
  return DELETE(new Request(`http://localhost/api/essays/${essayId}`, { method: "DELETE" }), {
    params: Promise.resolve({ essayId }),
  });
}

describe("DELETE /api/essays/[essayId]", () => {
  it("requires an activated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await del("essay_1");

    expect(response.status).toBe(401);
    expect(deleteCorrectionForUserMock).not.toHaveBeenCalled();
  });

  it("fails closed while a Clerk identity cannot be safely provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(
      new AppUserProvisioningErrorMock("identity cannot be linked"),
    );

    const response = await del("essay_1");

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Your account is still being set up. Please try again.",
      code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
    });
    expect(deleteCorrectionForUserMock).not.toHaveBeenCalled();
  });

  it("deletes the owner-scoped correction and returns 204", async () => {
    const response = await del("essay_1");

    expect(response.status).toBe(204);
    expect(deleteCorrectionForUserMock).toHaveBeenCalledWith(LOCAL_USER_ID, "essay_1");
  });

  it("returns 404 for an unowned, missing, or unreviewed essay", async () => {
    deleteCorrectionForUserMock.mockResolvedValue(false);

    const response = await del("another_users_essay");

    expect(response.status).toBe(404);
  });
});
