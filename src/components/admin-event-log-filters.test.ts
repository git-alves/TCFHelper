import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

const { AdminEventLogFilters, adminEventLogFilterHref } = await import("./admin-event-log-filters");

describe("adminEventLogFilterHref", () => {
  it("preserves every validated filter while resetting a changed search to page one", () => {
    expect(
      adminEventLogFilterHref(
        {
          range: "custom",
          from: "2026-08-10T12:00:00.000Z",
          to: "2026-08-11T12:00:00.000Z",
          severity: "WARN",
          module: "QUOTA_ACCESS",
          q: "learner@example.com",
          limit: 50,
        },
      ),
    ).toBe(
      "/admin/logs?range=custom&severity=WARN&module=QUOTA_ACCESS&page=1&limit=50&q=learner%40example.com&from=2026-08-10T12%3A00%3A00.000Z&to=2026-08-11T12%3A00%3A00.000Z",
    );
  });

  it("renders text-visible severity controls and the agreed module labels", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminEventLogFilters, {
        filters: {
          range: "today",
          from: null,
          to: null,
          severity: "WARN",
          module: "ESSAY_SERVICE",
          q: "",
          page: 1,
          limit: 20,
        },
      }),
    );

    expect(markup).toContain('name="severity"');
    expect(markup).toContain(">All<");
    expect(markup).toContain("INFO");
    expect(markup).toContain("WARN");
    expect(markup).toContain("ERROR");
    expect(markup).toContain("All modules");
    expect(markup).toContain("AI services");
  });
});
