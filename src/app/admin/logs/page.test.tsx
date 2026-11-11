import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentAdminUserMock,
  getAdminEventLogPageMock,
  parseAdminEventLogQueryMock,
  redirectMock,
} = vi.hoisted(() => ({
  getCurrentAdminUserMock: vi.fn(),
  getAdminEventLogPageMock: vi.fn(),
  parseAdminEventLogQueryMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/components/admin-event-log-filters", () => ({
  AdminEventLogFilters: ({ filters }: { filters: { q: string } }) => <div data-testid="event-log-filters" data-query={filters.q} />,
}));
vi.mock("@/components/admin-export-csv-button", () => ({
  AdminExportCsvButton: ({ href, label, hint }: { href: string; label: string; hint: string }) => (
    <button data-testid="export-button" data-href={href} data-hint={hint}>
      {label}
    </button>
  ),
}));
vi.mock("@/components/admin-event-log-table", () => ({
  AdminEventLogTable: () => <div data-testid="event-log-table" />,
}));
vi.mock("@/lib/app-user", () => {
  class AppUserProvisioningError extends Error {}
  return { AppUserProvisioningError, getCurrentAdminUser: getCurrentAdminUserMock };
});
vi.mock("@/lib/admin-event-log", () => {
  class AdminEventLogQueryError extends Error {}
  class AdminEventLogSearchTooBroadError extends Error {}
  return {
    AdminEventLogQueryError,
    AdminEventLogSearchTooBroadError,
    adminEventLogHref: (filters: { q: string }, page: number) => `/admin/logs?q=${filters.q}&page=${page}`,
    adminEventLogExportHref: (filters: { q: string; severity: string | null }) =>
      `/api/admin/logs/export?severity=${filters.severity ?? "all"}&q=${filters.q}`,
    getAdminEventLogPage: getAdminEventLogPageMock,
    parseAdminEventLogQuery: parseAdminEventLogQueryMock,
  };
});
vi.mock("next/navigation", () => ({ notFound: vi.fn(), redirect: redirectMock }));

const { default: AdminLogsPage } = await import("./page");
const { AdminEventLogSearchTooBroadError } = await import("@/lib/admin-event-log");

const QUERY = {
  range: "today",
  from: null,
  to: null,
  severity: null,
  module: null,
  q: "a",
  page: 1,
  limit: 20,
  start: new Date("2026-08-11T00:00:00.000Z"),
  end: new Date("2026-08-11T12:00:00.000Z"),
};

beforeEach(() => {
  getCurrentAdminUserMock.mockReset();
  getAdminEventLogPageMock.mockReset();
  parseAdminEventLogQueryMock.mockReset();
  redirectMock.mockReset();
  getCurrentAdminUserMock.mockResolvedValue({ id: "owner_1", isAdmin: true });
  parseAdminEventLogQueryMock.mockReturnValue(QUERY);
});

describe("/admin/logs", () => {
  it("shows the explicit broad-search state instead of rendering partial results", async () => {
    getAdminEventLogPageMock.mockRejectedValue(new AdminEventLogSearchTooBroadError());

    const page = await AdminLogsPage({ searchParams: Promise.resolve({ q: "a" }) });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("Search is too broad");
    expect(markup).toContain("No partial email matches were shown.");
    expect(markup).toContain('data-testid="event-log-filters"');
    expect(markup).toContain('data-query="a"');
    expect(markup).not.toContain('data-testid="event-log-table"');
  });

  it("explains that Authentication records only new Clerk sessions, not a returned existing session", async () => {
    const authenticationQuery = { ...QUERY, module: "AUTH_SECURITY" };
    parseAdminEventLogQueryMock.mockReturnValue(authenticationQuery);
    getAdminEventLogPageMock.mockResolvedValue({
      events: [],
      total: 0,
      page: 1,
      pageCount: 1,
      filters: authenticationQuery,
      retentionCutoff: "2026-07-12T12:00:00.000Z",
    });

    const page = await AdminLogsPage({ searchParams: Promise.resolve({ module: "AUTH_SECURITY" }) });
    const markup = renderToStaticMarkup(page);

    expect(markup).toContain("No new authenticated sessions recorded in this range");
    expect(markup).toContain("returning in an existing session does not create another row");
    expect(markup).toContain("raw IP addresses, user agents, and session IDs are never stored");
  });

  describe("Export .txt", () => {
    function pageWith(total: number, filters: object = QUERY) {
      getAdminEventLogPageMock.mockResolvedValue({
        events: total > 0 ? [{ id: "e1" }] : [],
        total,
        page: 1,
        pageCount: 1,
        filters,
        retentionCutoff: "2026-07-12T12:00:00.000Z",
      });
    }

    it("is offered with the current filters in its href, and says what it covers", async () => {
      pageWith(3, { ...QUERY, severity: "ERROR", q: "gemini" });

      const markup = renderToStaticMarkup(await AdminLogsPage({ searchParams: Promise.resolve({ severity: "ERROR", q: "gemini" }) }));

      expect(markup).toContain('data-testid="export-button"');
      expect(markup).toContain('data-href="/api/admin/logs/export?severity=ERROR&amp;q=gemini"');
      expect(markup).toContain("Export .txt");
      expect(markup).toContain("Exports all events matching the current filters.");
    });

    it("is not offered when no event matches", async () => {
      pageWith(0);

      const markup = renderToStaticMarkup(await AdminLogsPage({ searchParams: Promise.resolve({}) }));

      expect(markup).not.toContain('data-testid="export-button"');
    });

    it("is not offered when the search was too broad to show results", async () => {
      getAdminEventLogPageMock.mockRejectedValue(new AdminEventLogSearchTooBroadError());

      const markup = renderToStaticMarkup(await AdminLogsPage({ searchParams: Promise.resolve({ q: "a" }) }));

      expect(markup).not.toContain('data-testid="export-button"');
    });
  });
});

