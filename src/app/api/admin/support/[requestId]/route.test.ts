import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, deleteSupportRequestMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  deleteSupportRequestMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-support", () => ({
  deleteSupportRequest: deleteSupportRequestMock,
}));

const { DELETE, GET, OPTIONS } = await import("./route");

function deleteRequest() {
  return new Request("http://localhost/api/admin/support/request_1", { method: "DELETE" });
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  deleteSupportRequestMock.mockReset();

  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  deleteSupportRequestMock.mockResolvedValue({ kind: "deleted" });
});

describe("DELETE /api/admin/support/[requestId]", () => {
  it("does not disclose the route to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ requestId: "request_1" }) });

    expect(response.status).toBe(404);
    expect(deleteSupportRequestMock).not.toHaveBeenCalled();
  });

  it("does not disclose unsupported methods to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const getResponse = await GET();
    const optionsResponse = await OPTIONS();

    expect(getResponse.status).toBe(404);
    expect(optionsResponse.status).toBe(404);
    expect(deleteSupportRequestMock).not.toHaveBeenCalled();
  });

  it("returns a private method error to the owner for unsupported methods", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("DELETE");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("deletes an existing request", async () => {
    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ requestId: "request_1" }) });

    expect(response.status).toBe(200);
    expect(deleteSupportRequestMock).toHaveBeenCalledWith("request_1");
    await expect(response.json()).resolves.toEqual({ deleted: true });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not reveal an unknown request", async () => {
    deleteSupportRequestMock.mockResolvedValue({ kind: "notFound" });

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ requestId: "missing" }) });

    expect(response.status).toBe(404);
  });

  it("reports a definite 504 -- not deleted -- when the database could not confirm the deletion in time", async () => {
    deleteSupportRequestMock.mockResolvedValue({ kind: "timedOut" });

    const response = await DELETE(deleteRequest(), { params: Promise.resolve({ requestId: "request_1" }) });

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toEqual({
      error: "This deletion could not be confirmed in time. The request was not deleted — please try again.",
    });
  });
});
