import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, deleteAccessCodeMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  deleteAccessCodeMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-access-codes", () => ({
  deleteAccessCode: deleteAccessCodeMock,
}));

const { DELETE, GET, OPTIONS } = await import("./route");

function deleteRequest() {
  return new Request("http://localhost/api/admin/access-codes/code_1", { method: "DELETE" });
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  deleteAccessCodeMock.mockReset();

  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  deleteAccessCodeMock.mockResolvedValue({ kind: "deleted" });
});

describe("DELETE /api/admin/access-codes/[accessCodeId]", () => {
  it("does not disclose the route to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ accessCodeId: "code_1" }) });

    expect(response.status).toBe(404);
    expect(deleteAccessCodeMock).not.toHaveBeenCalled();
  });

  it("does not disclose unsupported methods to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const getResponse = await GET();
    const optionsResponse = await OPTIONS();

    expect(getResponse.status).toBe(404);
    expect(optionsResponse.status).toBe(404);
    expect(deleteAccessCodeMock).not.toHaveBeenCalled();
  });

  it("returns a private method error to the owner for unsupported methods", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("DELETE");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("deletes a code with no live admission", async () => {
    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ accessCodeId: "code_1" }) });

    expect(response.status).toBe(200);
    expect(deleteAccessCodeMock).toHaveBeenCalledWith("code_1");
    await expect(response.json()).resolves.toEqual({ deleted: true });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not reveal an unknown code", async () => {
    deleteAccessCodeMock.mockResolvedValue({ kind: "notFound" });

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ accessCodeId: "missing" }) });

    expect(response.status).toBe(404);
  });

  it("refuses to delete a code that is actively granting a learner access", async () => {
    deleteAccessCodeMock.mockResolvedValue({ kind: "activelyRedeemed" });

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ accessCodeId: "code_1" }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "This code is currently granting a learner access. Deactivate their admission first.",
    });
  });
});
