import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, findUniqueMock, updateMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404 }),
  adminJsonResponse: (body: unknown, status = 200) => Response.json(body, { status }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock, update: updateMock } },
}));

const { PATCH } = await import("./route");

function request(isBlocked: boolean) {
  return new Request("http://localhost/api/admin/users/user_2/block", {
    method: "PATCH",
    body: JSON.stringify({ isBlocked }),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  findUniqueMock.mockReset();
  updateMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  findUniqueMock.mockResolvedValue({ id: "user_2", isAdmin: false });
  updateMock.mockResolvedValue({ id: "user_2", isBlocked: true });
});

describe("PATCH /api/admin/users/[userId]/block", () => {
  it("does not disclose the route when the requester is not the owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await PATCH(request(true), { params: Promise.resolve({ userId: "user_2" }) });

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("blocks another learner through the owner-only route", async () => {
    const response = await PATCH(request(true), { params: Promise.resolve({ userId: "user_2" }) });

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user_2" }, data: { isBlocked: true } }),
    );
    await expect(response.json()).resolves.toEqual({ user: { id: "user_2", isBlocked: true } });
  });

  it("does not let the owner block themself", async () => {
    findUniqueMock.mockResolvedValue({ id: "owner_1", isAdmin: true });

    const response = await PATCH(request(true), { params: Promise.resolve({ userId: "owner_1" }) });

    expect(response.status).toBe(409);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
