import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, findUniqueMock, resetAccessCodeActivationMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  resetAccessCodeActivationMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404 }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/access-code", () => ({
  resetAccessCodeActivation: resetAccessCodeActivationMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUniqueMock } },
}));

const { GET, OPTIONS, POST } = await import("./route");

function resetRequest() {
  return new Request("http://localhost/api/admin/users/user_2/activation/reset", { method: "POST" });
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  findUniqueMock.mockReset();
  resetAccessCodeActivationMock.mockReset();

  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  findUniqueMock.mockResolvedValue({ id: "user_2", isAdmin: false });
  resetAccessCodeActivationMock.mockResolvedValue({ kind: "reset" });
});

describe("POST /api/admin/users/[userId]/activation/reset", () => {
  it("does not disclose the route to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await POST(resetRequest(), { params: Promise.resolve({ userId: "user_2" }) });

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(resetAccessCodeActivationMock).not.toHaveBeenCalled();
  });

  it("does not disclose unsupported methods to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const getResponse = await GET();
    const optionsResponse = await OPTIONS();

    expect(getResponse.status).toBe(404);
    expect(optionsResponse.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(resetAccessCodeActivationMock).not.toHaveBeenCalled();
  });

  it("returns a private method error to the owner for unsupported methods", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not reveal an unknown target", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await POST(resetRequest(), { params: Promise.resolve({ userId: "missing" }) });

    expect(response.status).toBe(404);
    expect(resetAccessCodeActivationMock).not.toHaveBeenCalled();
  });

  it("does not let the owner deactivate their activation-exempt account", async () => {
    findUniqueMock.mockResolvedValue({ id: "owner_1", isAdmin: true });

    const response = await POST(resetRequest(), { params: Promise.resolve({ userId: "owner_1" }) });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "The owner account does not use an access code.",
    });
    expect(resetAccessCodeActivationMock).not.toHaveBeenCalled();
  });

  it("deactivates another learner without exposing cacheable account state", async () => {
    const response = await POST(resetRequest(), { params: Promise.resolve({ userId: "user_2" }) });

    expect(response.status).toBe(200);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "user_2" },
      select: { id: true, isAdmin: true },
    });
    expect(resetAccessCodeActivationMock).toHaveBeenCalledWith("user_2");
    await expect(response.json()).resolves.toEqual({ activated: false, reset: true });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("is idempotent once a learner is already awaiting a new code", async () => {
    resetAccessCodeActivationMock.mockResolvedValue({ kind: "notActivated" });

    const response = await POST(resetRequest(), { params: Promise.resolve({ userId: "user_2" }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ activated: false, reset: false });
  });
});
