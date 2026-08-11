import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, getAdminUsersForExportMock, parseAdminUserListQueryMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  getAdminUsersForExportMock: vi.fn(),
  parseAdminUserListQueryMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-users", () => ({
  getAdminUsersForExport: getAdminUsersForExportMock,
  parseAdminUserListQuery: parseAdminUserListQueryMock,
  MAX_USERS_EXPORT_ROWS: 10_000,
}));

const { GET } = await import("./route");

function exportRequest(params?: { query?: string; status?: string }) {
  const url = new URL("http://localhost/api/admin/users/export");
  if (params?.query !== undefined) url.searchParams.set("query", params.query);
  if (params?.status !== undefined) url.searchParams.set("status", params.status);
  return new Request(url);
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  getAdminUsersForExportMock.mockReset();
  parseAdminUserListQueryMock.mockReset();

  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  getAdminUsersForExportMock.mockResolvedValue({ truncated: false, users: [] });
  parseAdminUserListQueryMock.mockImplementation(({ query, status }: { query?: string; status?: string }) => ({
    query: query ?? "",
    status: status ?? "all",
  }));
});

describe("GET /api/admin/users/export", () => {
  it("does not disclose the route to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await GET(exportRequest());

    expect(response.status).toBe(404);
    expect(getAdminUsersForExportMock).not.toHaveBeenCalled();
  });

  it("passes the search query and status filter through", async () => {
    await GET(exportRequest({ query: "diogo", status: "blocked" }));

    expect(getAdminUsersForExportMock).toHaveBeenCalledWith({ query: "diogo", status: "blocked" });
  });

  it("returns a downloadable CSV with the expected headers and usage figures", async () => {
    getAdminUsersForExportMock.mockResolvedValue({
      truncated: false,
      users: [
        {
          id: "user_1",
          email: "learner@example.com",
          name: "Learner, One",
          createdAt: "2026-08-01T00:00:00.000Z",
          isAdmin: false,
          isBlocked: true,
          activatedAt: "2026-08-02T00:00:00.000Z",
          usage: {
            translation: { currentMinuteRequests: 0, currentMinuteCharacters: 0, currentMonthCharacters: 4200 },
            examples: { currentDayRequests: 3 },
            corrections: { currentDayRequests: 1, currentMonthRequests: 10 },
          },
        },
      ],
    });

    const response = await GET(exportRequest());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="users.csv"');
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(body).toContain(
      "Email,Name,Joined at,Activated at,Admin,Blocked,Translation chars (month),Example generations (day),Corrections (day)\r\n",
    );
    expect(body).toContain('learner@example.com,"Learner, One",2026-08-01T00:00:00.000Z');
    expect(body).toContain("no,yes,4200,3,1\r\n");
  });

  it("refuses with a 413 instead of silently truncating when the filter matches too many rows", async () => {
    getAdminUsersForExportMock.mockResolvedValue({ truncated: true, total: 12_345 });

    const response = await GET(exportRequest());

    expect(response.status).toBe(413);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      error: "This filter matches 12,345 users, more than the 10,000-row export limit. Narrow your search before exporting.",
    });
  });
});
