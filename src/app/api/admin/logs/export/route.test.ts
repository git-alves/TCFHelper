import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, adminEventFindManyMock, userFindManyMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  adminEventFindManyMock: vi.fn(),
  userFindManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { adminEvent: { findMany: adminEventFindManyMock }, user: { findMany: userFindManyMock } },
}));

const { GET } = await import("./route");
const { MAX_ADMIN_LOG_EXPORT_ROWS } = await import("@/lib/admin-event-log");

const NOW = new Date("2026-11-14T10:32:05.789Z");
// An opaque row id is "c" plus 24 lowercase letters or digits.
const USER_ID = `cuser${"0".repeat(19)}1`;

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: "cevent000000000000000000001",
    occurredAt: new Date("2026-11-14T09:12:03.456Z"),
    firstOccurredAt: new Date("2026-11-14T09:12:03.456Z"),
    severity: "ERROR",
    module: "ESSAY_SERVICE",
    eventType: "CORRECTION_PROVIDER_FAILED",
    userId: USER_ID,
    essayId: null,
    accessCodeId: null,
    provider: "gemini",
    model: "gemini-3.5-flash-lite",
    reasonCode: "output_truncated",
    httpStatus: 502,
    quotaWindow: null,
    usageValue: null,
    quotaLimit: null,
    maskedIp: null,
    browserFamily: null,
    deviceClass: null,
    distinctIpCount: null,
    securityWindowMinutes: null,
    occurrenceCount: 1,
    ...overrides,
  };
}

function get(query = "") {
  return GET(new Request(`http://localhost/api/admin/logs/export${query}`));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  getAdminApiUserMock.mockReset();
  adminEventFindManyMock.mockReset();
  userFindManyMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "cuid_owner" });
  adminEventFindManyMock.mockResolvedValue([record()]);
  userFindManyMock.mockResolvedValue([{ id: USER_ID, email: "learner@example.com" }]);
});

describe("GET /api/admin/logs/export", () => {
  it("answers 404, with no hint the endpoint exists, to anyone who is not the owner, and reads nothing", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await get("?severity=ERROR");

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(adminEventFindManyMock).not.toHaveBeenCalled();
    expect(userFindManyMock).not.toHaveBeenCalled();
  });

  it("downloads the matching events as UTF-8 plain text with an attachment filename, uncached", async () => {
    const response = await get("?range=last-7-days&severity=ERROR");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="tcflab-logs-2026-11-14-1032.txt"');
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");

    const text = await response.text();
    expect(text).toContain("TCFLab operational log export");
    expect(text).toContain("Generated: 2026-11-14 10:32:05 UTC");
    expect(text).toContain("Time range: Last 7 days");
    expect(text).toContain("Level: ERROR");
    expect(text).toContain("Events: 1 (newest first)");
    expect(text).toContain("Retention cutoff: 2026-10-15 10:32:05 UTC");
    expect(text).toContain("2026-11-14 09:12:03 UTC | ERROR | AI services");
    expect(text).toContain("Correction generation failed (gemini): output truncated.");
    expect(text).toContain("User: learner@example.com");
    expect(text).toContain("Reason: output truncated");
    expect(text).toContain("HTTP status: 502");
  });

  it("applies the filters it is given, across all pages (no skip, one bounded read of cap + 1)", async () => {
    await get("?range=last-7-days&severity=ERROR&module=ESSAY_SERVICE&page=3&limit=20");

    const args = adminEventFindManyMock.mock.calls[0][0];
    expect(args.where).toMatchObject({
      severity: "ERROR",
      module: "ESSAY_SERVICE",
      occurredAt: { gte: new Date("2026-11-07T10:32:05.789Z"), lt: NOW },
    });
    expect(args.orderBy).toEqual([{ occurredAt: "desc" }, { id: "desc" }]);
    expect(args.take).toBe(MAX_ADMIN_LOG_EXPORT_ROWS + 1);
    // Page and limit shape the page view only; an export covers every page.
    expect(args).not.toHaveProperty("skip");
    expect(adminEventFindManyMock).toHaveBeenCalledTimes(1);
  });

  it("applies a search the way the page does", async () => {
    userFindManyMock.mockResolvedValueOnce([{ id: USER_ID }]).mockResolvedValue([]);

    await get("?q=learner@example.com");

    const { where } = adminEventFindManyMock.mock.calls[0][0];
    expect(where.OR).toEqual(expect.arrayContaining([{ userId: { in: [USER_ID] } }]));
  });

  it("selects only the columns the log shows, never searchText", async () => {
    await get();

    const { select } = adminEventFindManyMock.mock.calls[0][0];
    expect(select).not.toHaveProperty("searchText");
    expect(select).not.toHaveProperty("dedupeKey");
  });

  it("refuses, rather than truncating, when more events match than the cap", async () => {
    adminEventFindManyMock.mockResolvedValue(Array.from({ length: MAX_ADMIN_LOG_EXPORT_ROWS + 1 }, () => record()));

    const response = await get("?range=current-month");

    expect(response.status).toBe(413);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toBeNull();
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("5,000 events");
    expect(body.error).toContain("Narrow the date range");
  });

  it("exports exactly the cap, since only one more row proves overflow", async () => {
    adminEventFindManyMock.mockResolvedValue(Array.from({ length: MAX_ADMIN_LOG_EXPORT_ROWS }, () => record()));

    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Events: 5,000 (newest first)");
  });

  it.each([
    ["an unknown level", "?severity=FATAL"],
    ["an unknown range", "?range=forever"],
    ["an unknown parameter", "?format=csv"],
    ["a custom range without its ends", "?range=custom"],
    ["a custom range in the future", "?range=custom&from=2026-11-14T10:00&to=2027-01-01T00:00"],
    ["a duplicated parameter", "?severity=ERROR&severity=WARN"],
    ["an over-long search", `?q=${"a".repeat(121)}`],
  ])("rejects %s with 400, as the page does", async (_label, query) => {
    const response = await get(query);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid log query." });
    expect(adminEventFindManyMock).not.toHaveBeenCalled();
  });

  it("answers 422 for a search that matches too many accounts to be complete", async () => {
    userFindManyMock.mockResolvedValue(Array.from({ length: 101 }, (_, index) => ({ id: `c${index}` })));

    const response = await get("?q=a");

    expect(response.status).toBe(422);
    expect(adminEventFindManyMock).not.toHaveBeenCalled();
  });
});
