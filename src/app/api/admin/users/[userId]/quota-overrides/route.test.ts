import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, findUniqueMock, upsertMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404 }),
  adminJsonResponse: (body: unknown, status = 200) => Response.json(body, { status }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUniqueMock },
    userQuotaOverride: { upsert: upsertMock },
  },
}));
vi.mock("@/lib/admin-users", () => ({
  serializeQuotaOverride: (value: unknown) => value,
}));

const { PATCH } = await import("./route");

function request(body: unknown) {
  return new Request("http://localhost/api/admin/users/user_2/quota-overrides", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  findUniqueMock.mockReset();
  upsertMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  findUniqueMock.mockResolvedValue({ id: "user_2" });
  upsertMock.mockResolvedValue({
    translationRequestsPerMinute: 0,
    translationCharactersPerMinute: null,
    translationCharactersPerMonth: null,
    exampleGenerationsPerDay: 4,
    correctionRequestsPerDay: null,
  });
});

describe("PATCH /api/admin/users/[userId]/quota-overrides", () => {
  it("does not disclose the route when the requester is not the owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await PATCH(request({ exampleGenerationsPerDay: 4 }), {
      params: Promise.resolve({ userId: "user_2" }),
    });

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("preserves zero as a valid quota override", async () => {
    const response = await PATCH(
      request({ translationRequestsPerMinute: 0, exampleGenerationsPerDay: 4 }),
      { params: Promise.resolve({ userId: "user_2" }) },
    );

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: "user_2",
          translationRequestsPerMinute: 0,
          exampleGenerationsPerDay: 4,
        }),
      }),
    );
  });

  it("rejects a fractional or negative override before writing", async () => {
    const response = await PATCH(request({ correctionRequestsPerDay: -1.5 }), {
      params: Promise.resolve({ userId: "user_2" }),
    });

    expect(response.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
