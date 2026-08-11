import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, getAdminAccessCodesForExportMock, parseAdminAccessCodesListQueryMock } = vi.hoisted(
  () => ({
    getAdminApiUserMock: vi.fn(),
    getAdminAccessCodesForExportMock: vi.fn(),
    parseAdminAccessCodesListQueryMock: vi.fn(),
  }),
);

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/admin-access-codes", () => ({
  getAdminAccessCodesForExport: getAdminAccessCodesForExportMock,
  parseAdminAccessCodesListQuery: parseAdminAccessCodesListQueryMock,
  MAX_ACCESS_CODES_EXPORT_ROWS: 10_000,
}));

const { GET } = await import("./route");

function exportRequest(query?: string) {
  const url = new URL("http://localhost/api/admin/access-codes/export");
  if (query !== undefined) url.searchParams.set("query", query);
  return new Request(url);
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  getAdminAccessCodesForExportMock.mockReset();
  parseAdminAccessCodesListQueryMock.mockReset();

  getAdminApiUserMock.mockResolvedValue({ id: "owner_1" });
  getAdminAccessCodesForExportMock.mockResolvedValue({ truncated: false, accessCodes: [] });
  parseAdminAccessCodesListQueryMock.mockImplementation(({ query }: { query?: string }) => ({
    query: query ?? "",
  }));
});

describe("GET /api/admin/access-codes/export", () => {
  it("does not disclose the route to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await GET(exportRequest());

    expect(response.status).toBe(404);
    expect(getAdminAccessCodesForExportMock).not.toHaveBeenCalled();
  });

  it("passes the search query through to the export query", async () => {
    await GET(exportRequest("cohort-3"));

    expect(getAdminAccessCodesForExportMock).toHaveBeenCalledWith("cohort-3");
  });

  it("returns a downloadable CSV with the expected headers and escaping", async () => {
    getAdminAccessCodesForExportMock.mockResolvedValue({
      truncated: false,
      accessCodes: [
        {
          id: "code_1",
          code: "TCF-AB12-CD34-EF56-GH78",
          note: "spring cohort, batch 1",
          createdAt: "2026-08-01T00:00:00.000Z",
          redeemedAt: "2026-08-02T00:00:00.000Z",
          redeemedByUserEmail: "learner@example.com",
          validityDays: 30,
          expiresAt: "2026-09-01T00:00:00.000Z",
        },
        {
          id: "code_2",
          code: "TCF-BBBB-BBBB-BBBB-BBBB",
          note: null,
          createdAt: "2026-08-03T00:00:00.000Z",
          redeemedAt: null,
          redeemedByUserEmail: null,
          validityDays: null,
          expiresAt: null,
        },
      ],
    });

    const response = await GET(exportRequest());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="access-codes.csv"');
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(body).toContain("Code,Note,Created at,Redeemed by,Redeemed at,Validity,Expires at\r\n");
    expect(body).toContain('TCF-AB12-CD34-EF56-GH78,"spring cohort, batch 1"');
    expect(body).toContain("30 days");
    expect(body).toContain("TCF-BBBB-BBBB-BBBB-BBBB,,2026-08-03T00:00:00.000Z,,,Lifetime,\r\n");
  });

  it("refuses with a 413 instead of silently truncating when the filter matches too many rows", async () => {
    getAdminAccessCodesForExportMock.mockResolvedValue({ truncated: true });

    const response = await GET(exportRequest());

    expect(response.status).toBe(413);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({
      error: "This filter matches more than 10,000 codes, the export limit. Narrow your search before exporting.",
    });
  });
});
