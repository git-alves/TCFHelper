import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, parseQueryMock, readLogPageMock, readUrlParamsMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  parseQueryMock: vi.fn(),
  readLogPageMock: vi.fn(),
  readUrlParamsMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-event-log", () => {
  class AdminEventLogQueryError extends Error {}
  class AdminEventLogSearchTooBroadError extends Error {}
  return {
    AdminEventLogQueryError,
    AdminEventLogSearchTooBroadError,
    adminEventLogSearchParamsFromUrl: readUrlParamsMock,
    parseAdminEventLogQuery: parseQueryMock,
    getAdminEventLogPage: readLogPageMock,
  };
});

const { GET } = await import("./route");
const { AdminEventLogQueryError, AdminEventLogSearchTooBroadError } = await import("@/lib/admin-event-log");

const ADMIN = { id: "owner_1", isAdmin: true };
const QUERY = { range: "today" };
const PAGE = {
  events: [],
  total: 0,
  page: 1,
  pageCount: 1,
  filters: { range: "today", from: null, to: null, severity: null, module: null, q: "", page: 1, limit: 20 },
  retentionCutoff: "2026-07-12T12:00:00.000Z",
};

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  parseQueryMock.mockReset();
  readLogPageMock.mockReset();
  readUrlParamsMock.mockReset();
  getAdminApiUserMock.mockResolvedValue(ADMIN);
  readUrlParamsMock.mockReturnValue({ range: "today" });
  parseQueryMock.mockReturnValue(QUERY);
  readLogPageMock.mockResolvedValue(PAGE);
});

describe("GET /api/admin/logs", () => {
  it("returns a generic private no-store 404 before parsing for a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/logs?range=custom"));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(readUrlParamsMock).not.toHaveBeenCalled();
    expect(parseQueryMock).not.toHaveBeenCalled();
    expect(readLogPageMock).not.toHaveBeenCalled();
  });

  it("lists a validated log page without allowing polling to touch owner presence", async () => {
    const response = await GET(new Request("http://localhost/api/admin/logs?range=today"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(PAGE);
    expect(getAdminApiUserMock).toHaveBeenCalledWith({ skipPresenceTouch: true });
    expect(parseQueryMock).toHaveBeenCalledWith({ range: "today" }, expect.any(Date));
    expect(readLogPageMock).toHaveBeenCalledWith(QUERY, expect.any(Date));
    expect(parseQueryMock.mock.calls[0][1]).toBe(readLogPageMock.mock.calls[0][1]);
  });

  it("returns a private no-store generic validation error", async () => {
    parseQueryMock.mockImplementation(() => {
      throw new AdminEventLogQueryError();
    });

    const response = await GET(new Request("http://localhost/api/admin/logs?limit=25"));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ error: "Invalid log query." });
    expect(readLogPageMock).not.toHaveBeenCalled();
  });

  it("returns an explicit private no-store outcome when email matching would be incomplete", async () => {
    readLogPageMock.mockRejectedValue(new AdminEventLogSearchTooBroadError());

    const response = await GET(new Request("http://localhost/api/admin/logs?q=a"));

    expect(response.status).toBe(422);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ error: "Search is too broad. Use a more specific email or identifier." });
  });
});
