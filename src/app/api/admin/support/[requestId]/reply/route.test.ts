import { beforeEach, describe, expect, it, vi } from "vitest";

const { adminMock, editMock } = vi.hoisted(() => ({ adminMock: vi.fn(), editMock: vi.fn() }));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: adminMock,
  adminNotFoundResponse: () => new Response(null, { status: 404 }),
  adminJsonResponse: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status }),
}));
vi.mock("@/lib/support-resolution", () => ({ SUPPORT_RESOLUTION_NOTE_MAX_CHARS: 500, editSupportResolutionNote: editMock }));

const { PATCH } = await import("./route");

function call(body: unknown, raw = false) {
  const request = new Request("http://localhost/api/admin/support/req_1/reply", {
    method: "PATCH",
    body: raw ? (body as string) : JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ requestId: "req_1" }) });
}

beforeEach(() => {
  adminMock.mockReset();
  editMock.mockReset();
  adminMock.mockResolvedValue({ id: "owner" });
  editMock.mockResolvedValue({ kind: "updated" });
});

describe("PATCH /api/admin/support/[requestId]/reply", () => {
  it("answers a non-admin with the admin routes' 404, without touching the request", async () => {
    adminMock.mockResolvedValue(null);

    expect((await call({ note: "x" })).status).toBe(404);
    expect(editMock).not.toHaveBeenCalled();
  });

  it("rejects an empty, blank or over-limit note", async () => {
    expect((await call({ note: "" })).status).toBe(400);
    expect((await call({ note: "   " })).status).toBe(400);
    expect((await call({ note: "x".repeat(501) })).status).toBe(400);
    expect(editMock).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON and unexpected keys", async () => {
    expect((await call("{not json", true)).status).toBe(400);
    expect((await call({ note: "x", resolvedAt: "2026-01-01" })).status).toBe(400);
    expect(editMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a request that does not exist", async () => {
    editMock.mockResolvedValue({ kind: "notFound" });

    expect((await call({ note: "x" })).status).toBe(404);
  });

  it("answers 409 once the learner has opened, dismissed or answered the notice", async () => {
    editMock.mockResolvedValue({ kind: "notEditable" });

    const response = await call({ note: "x" });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "The learner has already opened this reply, or its notice has expired, so it can't be edited.",
    });
  });

  it("saves the trimmed note", async () => {
    const response = await call({ note: "  Clear your cache.  " });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ updated: true });
    expect(editMock).toHaveBeenCalledWith("req_1", "Clear your cache.");
  });
});
