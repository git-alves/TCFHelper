import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, createAccessCodeMock, listAccessCodesMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  createAccessCodeMock: vi.fn(),
  listAccessCodesMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-access-codes", () => ({
  createAccessCode: createAccessCodeMock,
  listAccessCodes: listAccessCodesMock,
}));

const { GET, POST } = await import("./route");

const ADMIN = { id: "cuid_admin_1", isAdmin: true };
const CODE = {
  id: "code_1",
  code: "TCF-AB12-CD34",
  note: null,
  createdAt: "2026-08-10T00:00:00.000Z",
  redeemedAt: null,
  redeemedByUserEmail: null,
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/admin/access-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  createAccessCodeMock.mockReset();
  listAccessCodesMock.mockReset();
  getAdminApiUserMock.mockResolvedValue(ADMIN);
  listAccessCodesMock.mockResolvedValue([CODE]);
  createAccessCodeMock.mockResolvedValue(CODE);
});

describe("GET /api/admin/access-codes", () => {
  it("returns a non-disclosing 404 for a non-admin", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("lists codes for the admin", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ accessCodes: [CODE] });
  });
});

describe("POST /api/admin/access-codes", () => {
  it("returns a non-disclosing 404 for a non-admin", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await POST(postRequest({ note: "batch" }));

    expect(response.status).toBe(404);
    expect(createAccessCodeMock).not.toHaveBeenCalled();
  });

  it("rejects a payload with unexpected fields", async () => {
    const response = await POST(postRequest({ note: "batch", code: "TCF-0000-0000" }));

    expect(response.status).toBe(400);
    expect(createAccessCodeMock).not.toHaveBeenCalled();
  });

  it("creates a code with a trimmed note", async () => {
    const response = await POST(postRequest({ note: "batch" }));

    expect(response.status).toBe(201);
    expect(createAccessCodeMock).toHaveBeenCalledWith("batch");
    expect(await response.json()).toEqual({ accessCode: CODE });
  });

  it("creates a code with no note", async () => {
    const response = await POST(postRequest({}));

    expect(response.status).toBe(201);
    expect(createAccessCodeMock).toHaveBeenCalledWith(null);
  });
});
