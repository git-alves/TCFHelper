import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, getAdminOverviewStatsMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  getAdminOverviewStatsMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-overview", () => ({ getAdminOverviewStats: getAdminOverviewStatsMock }));

const { GET } = await import("./route");

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  getAdminOverviewStatsMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "owner_1", isAdmin: true });
  getAdminOverviewStatsMock.mockResolvedValue({ users: { total: 1 } });
});

describe("GET /api/admin/overview", () => {
  it("returns a non-disclosing 404 without checking overview data for a non-admin", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(getAdminOverviewStatsMock).not.toHaveBeenCalled();
  });

  it("returns live overview data for the owner", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ stats: { users: { total: 1 } } });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not let its own polling keep the owner perpetually marked online", async () => {
    await GET();

    expect(getAdminApiUserMock).toHaveBeenCalledWith({ skipPresenceTouch: true });
  });
});
