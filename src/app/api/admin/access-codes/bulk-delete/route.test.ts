import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, deleteAccessCodesMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  deleteAccessCodesMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-access-codes", () => ({
  deleteAccessCodes: deleteAccessCodesMock,
}));
vi.mock("@/lib/access-code-limits", () => ({
  ADMIN_ACCESS_CODES_PAGE_SIZE: 50,
}));

const { DELETE, GET, POST } = await import("./route");

function bulkDeleteRequest(body: unknown) {
  return new Request("http://localhost/api/admin/access-codes/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  deleteAccessCodesMock.mockReset();

  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  deleteAccessCodesMock.mockResolvedValue({ deletedCount: 2, requestedCount: 2 });
});

describe("POST /api/admin/access-codes/bulk-delete", () => {
  it("does not disclose the route to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await POST(bulkDeleteRequest({ ids: ["code_1"] }));

    expect(response.status).toBe(404);
    expect(deleteAccessCodesMock).not.toHaveBeenCalled();
  });

  it("does not disclose unsupported methods to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const getResponse = await GET();
    const deleteResponse = await DELETE();

    expect(getResponse.status).toBe(404);
    expect(deleteResponse.status).toBe(404);
    expect(deleteAccessCodesMock).not.toHaveBeenCalled();
  });

  it("returns a private method error to the owner for unsupported methods", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects a payload with unexpected fields", async () => {
    const response = await POST(bulkDeleteRequest({ ids: ["code_1"], extra: true }));

    expect(response.status).toBe(400);
    expect(deleteAccessCodesMock).not.toHaveBeenCalled();
  });

  it("rejects an empty selection", async () => {
    const response = await POST(bulkDeleteRequest({ ids: [] }));

    expect(response.status).toBe(400);
    expect(deleteAccessCodesMock).not.toHaveBeenCalled();
  });

  it("rejects a selection larger than one page", async () => {
    const response = await POST(bulkDeleteRequest({ ids: Array.from({ length: 51 }, (_, i) => `code_${i}`) }));

    expect(response.status).toBe(400);
    expect(deleteAccessCodesMock).not.toHaveBeenCalled();
  });

  it("deletes the requested codes and reports the outcome", async () => {
    const response = await POST(bulkDeleteRequest({ ids: ["code_1", "code_2"] }));

    expect(response.status).toBe(200);
    expect(deleteAccessCodesMock).toHaveBeenCalledWith(["code_1", "code_2"]);
    await expect(response.json()).resolves.toEqual({ deletedCount: 2, requestedCount: 2 });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("reports a definite 504 -- none deleted -- when the database could not confirm the deletion in time", async () => {
    deleteAccessCodesMock.mockResolvedValue({ timedOut: true, requestedCount: 2 });

    const response = await POST(bulkDeleteRequest({ ids: ["code_1", "code_2"] }));

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: "This deletion could not be confirmed in time. None of the selected codes were deleted — please try again.",
    });
  });
});
