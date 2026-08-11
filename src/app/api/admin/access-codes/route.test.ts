import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, createAccessCodesMock, getAdminAccessCodesPageMock, parseAdminAccessCodesListQueryMock } =
  vi.hoisted(() => ({
    getAdminApiUserMock: vi.fn(),
    createAccessCodesMock: vi.fn(),
    getAdminAccessCodesPageMock: vi.fn(),
    parseAdminAccessCodesListQueryMock: vi.fn(),
  }));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-access-codes", () => ({
  createAccessCodes: createAccessCodesMock,
  getAdminAccessCodesPage: getAdminAccessCodesPageMock,
  parseAdminAccessCodesListQuery: parseAdminAccessCodesListQueryMock,
}));
vi.mock("@/lib/access-code-limits", () => ({
  MAX_ACCESS_CODE_BATCH_SIZE: 10,
  MAX_VALIDITY_DAYS: 3650,
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
  validityDays: null,
  expiresAt: null,
};

function postRequest(body: unknown) {
  return new Request("http://localhost/api/admin/access-codes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getRequest(search = "") {
  return new Request(`http://localhost/api/admin/access-codes${search}`);
}

const CODES_PAGE = { accessCodes: [CODE], total: 1, page: 1, pageCount: 1, query: "" };

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  createAccessCodesMock.mockReset();
  getAdminAccessCodesPageMock.mockReset();
  parseAdminAccessCodesListQueryMock.mockReset();
  getAdminApiUserMock.mockResolvedValue(ADMIN);
  getAdminAccessCodesPageMock.mockResolvedValue(CODES_PAGE);
  parseAdminAccessCodesListQueryMock.mockImplementation(({ query, page }) => ({
    query: query ?? "",
    page: page ? Number(page) : 1,
  }));
  createAccessCodesMock.mockResolvedValue([CODE]);
});

describe("GET /api/admin/access-codes", () => {
  it("returns a non-disclosing 404 for a non-admin", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await GET(getRequest());

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });

  it("lists codes for the admin", async () => {
    const response = await GET(getRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(CODES_PAGE);
  });

  it("parses query and page from the request URL", async () => {
    await GET(getRequest("?query=learner%40example.com&page=2"));

    expect(parseAdminAccessCodesListQueryMock).toHaveBeenCalledWith({
      query: "learner@example.com",
      page: "2",
    });
    expect(getAdminAccessCodesPageMock).toHaveBeenCalledWith({ query: "learner@example.com", page: 2 });
  });
});

describe("POST /api/admin/access-codes", () => {
  it("returns a non-disclosing 404 for a non-admin", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await POST(postRequest({ note: "batch" }));

    expect(response.status).toBe(404);
    expect(createAccessCodesMock).not.toHaveBeenCalled();
  });

  it("rejects a payload with unexpected fields", async () => {
    const response = await POST(postRequest({ note: "batch", code: "TCF-0000-0000" }));

    expect(response.status).toBe(400);
    expect(createAccessCodesMock).not.toHaveBeenCalled();
  });

  it("creates a single lifetime code by default", async () => {
    const response = await POST(postRequest({ note: "batch" }));

    expect(response.status).toBe(201);
    expect(createAccessCodesMock).toHaveBeenCalledWith("batch", null, 1);
    expect(await response.json()).toEqual({ accessCodes: [CODE] });
  });

  it("creates a code with no note", async () => {
    const response = await POST(postRequest({}));

    expect(response.status).toBe(201);
    expect(createAccessCodesMock).toHaveBeenCalledWith(null, null, 1);
  });

  it("passes a requested validity period and batch count through", async () => {
    const response = await POST(postRequest({ note: "cohort", validityDays: 14, count: 10 }));

    expect(response.status).toBe(201);
    expect(createAccessCodesMock).toHaveBeenCalledWith("cohort", 14, 10);
  });

  it("rejects a non-positive validity period", async () => {
    const response = await POST(postRequest({ validityDays: 0 }));

    expect(response.status).toBe(400);
    expect(createAccessCodesMock).not.toHaveBeenCalled();
  });

  it("rejects a validity period above the server maximum", async () => {
    const response = await POST(postRequest({ validityDays: 3651 }));

    expect(response.status).toBe(400);
    expect(createAccessCodesMock).not.toHaveBeenCalled();
  });

  it("rejects a batch count above the server cap", async () => {
    const response = await POST(postRequest({ count: 11 }));

    expect(response.status).toBe(400);
    expect(createAccessCodesMock).not.toHaveBeenCalled();
  });
});
