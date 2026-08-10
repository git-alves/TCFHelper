import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getAdminApiUserMock,
  transactionMock,
  executeRawMock,
  findUniqueMock,
  overrideFindUniqueMock,
  upsertMock,
  deleteManyMock,
} = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  transactionMock: vi.fn(),
  executeRawMock: vi.fn(),
  findUniqueMock: vi.fn(),
  overrideFindUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
  deleteManyMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404 }),
  adminJsonResponse: (body: unknown, status = 200) => Response.json(body, { status }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
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
  transactionMock.mockReset();
  executeRawMock.mockReset();
  findUniqueMock.mockReset();
  overrideFindUniqueMock.mockReset();
  upsertMock.mockReset();
  deleteManyMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  findUniqueMock.mockResolvedValue({ id: "user_2" });
  overrideFindUniqueMock.mockResolvedValue(null);
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      $executeRaw: executeRawMock,
      user: { findUnique: findUniqueMock },
      userQuotaOverride: {
        findUnique: overrideFindUniqueMock,
        upsert: upsertMock,
        deleteMany: deleteManyMock,
      },
    }),
  );
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
    expect(transactionMock).not.toHaveBeenCalled();
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
    expect(executeRawMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a fractional or negative override before writing", async () => {
    const response = await PATCH(request({ correctionRequestsPerDay: -1.5 }), {
      params: Promise.resolve({ userId: "user_2" }),
    });

    expect(response.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("removes an override row when every field inherits the global default", async () => {
    overrideFindUniqueMock.mockResolvedValue({
      translationRequestsPerMinute: 2,
      translationCharactersPerMinute: null,
      translationCharactersPerMonth: null,
      exampleGenerationsPerDay: null,
      correctionRequestsPerDay: null,
    });

    const response = await PATCH(
      request({
        translationRequestsPerMinute: null,
        translationCharactersPerMinute: null,
        translationCharactersPerMonth: null,
        exampleGenerationsPerDay: null,
        correctionRequestsPerDay: null,
      }),
      { params: Promise.resolve({ userId: "user_2" }) },
    );

    expect(response.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { userId: "user_2" } });
    expect(upsertMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ quotaOverride: null });
  });
});
