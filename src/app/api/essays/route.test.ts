import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, deleteAllCorrectionsForUserMock } = vi.hoisted(
  () => {
    class AppUserProvisioningErrorMock extends Error {}

    return {
      getCurrentActivatedAppUserMock: vi.fn(),
      AppUserProvisioningErrorMock,
      deleteAllCorrectionsForUserMock: vi.fn(),
    };
  },
);

vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/correction-history", () => ({
  deleteAllCorrectionsForUser: deleteAllCorrectionsForUserMock,
}));

const { DELETE } = await import("./route");

const LOCAL_USER_ID = "cuid_local_user_1";

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  deleteAllCorrectionsForUserMock.mockReset();

  getCurrentActivatedAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
  deleteAllCorrectionsForUserMock.mockResolvedValue(3);
});

describe("DELETE /api/essays", () => {
  it("requires an activated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await DELETE();

    expect(response.status).toBe(401);
    expect(deleteAllCorrectionsForUserMock).not.toHaveBeenCalled();
  });

  it("fails closed while a Clerk identity cannot be safely provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("identity cannot be linked"));

    const response = await DELETE();

    expect(response.status).toBe(503);
    expect(deleteAllCorrectionsForUserMock).not.toHaveBeenCalled();
  });

  it("clears the signed-in learner's corrections only", async () => {
    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(deleteAllCorrectionsForUserMock).toHaveBeenCalledWith(LOCAL_USER_ID);
  });

  it("succeeds when there is nothing to clear", async () => {
    deleteAllCorrectionsForUserMock.mockResolvedValue(0);

    const response = await DELETE();

    expect(response.status).toBe(204);
  });
});
