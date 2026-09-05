import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAppUserMock, AppUserProvisioningErrorMock, updateManyMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    updateManyMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { updateMany: updateManyMock } },
}));

const { PUT } = await import("./route");

const LOCAL_USER_ID = "cuid_local_user_1";

function putRequest(body: unknown) {
  return new Request("http://localhost/api/me/timezone", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  updateManyMock.mockReset();

  getCurrentAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
  updateManyMock.mockResolvedValue({ count: 1 });
});

describe("PUT /api/me/timezone", () => {
  it("requires a signed-in user", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await PUT(putRequest({ timezone: "America/Sao_Paulo" }));

    expect(response.status).toBe(401);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("fails closed while a Clerk identity cannot be safely provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("identity cannot be linked"));

    const response = await PUT(putRequest({ timezone: "America/Sao_Paulo" }));

    expect(response.status).toBe(503);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("rejects a missing or malformed body", async () => {
    const response = await PUT(putRequest({}));

    expect(response.status).toBe(400);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("rejects a string Intl does not accept as a timezone", async () => {
    const response = await PUT(putRequest({ timezone: "Not/AZone" }));

    expect(response.status).toBe(400);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("rejects an unexpected extra field", async () => {
    const response = await PUT(putRequest({ timezone: "America/Sao_Paulo", extra: true }));

    expect(response.status).toBe(400);
    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("records a valid IANA timezone for the signed-in user", async () => {
    const response = await PUT(putRequest({ timezone: "America/Sao_Paulo" }));

    expect(response.status).toBe(204);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: LOCAL_USER_ID, OR: [{ timezone: null }, { timezone: { not: "America/Sao_Paulo" } }] },
      data: { timezone: "America/Sao_Paulo" },
    });
  });
});
