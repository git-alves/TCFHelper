import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminRecentActivityFeed } from "./admin-recent-activity-feed";

describe("AdminRecentActivityFeed", () => {
  it("shows the event's message and the resolved learner email, linked to their admin page", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminRecentActivityFeed, {
        initialEvents: [
          {
            id: "event_1",
            occurredAt: "2026-09-05T11:45:00.000Z",
            firstOccurredAt: "2026-09-05T11:45:00.000Z",
            severity: "INFO",
            module: "QUOTA_ACCESS",
            eventType: "ACCESS_CODE_REDEEMED",
            userId: "user_1",
            userEmail: "learner@example.com",
            essayId: null,
            accessCodeId: null,
            provider: null,
            reasonCode: null,
            httpStatus: null,
            quotaWindow: null,
            usageValue: null,
            quotaLimit: null,
            occurrenceCount: 1,
            message: "Access code redeemed.",
          },
        ],
      }),
    );

    expect(markup).toContain("Access code redeemed.");
    expect(markup).toContain("learner@example.com");
    expect(markup).toContain('href="/admin/users/user_1"');
  });

  it("falls back to the raw id when the email lookup did not resolve", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminRecentActivityFeed, {
        initialEvents: [
          {
            id: "event_2",
            occurredAt: "2026-09-05T11:45:00.000Z",
            firstOccurredAt: "2026-09-05T11:45:00.000Z",
            severity: "ERROR",
            module: "ESSAY_SERVICE",
            eventType: "CORRECTION_PROVIDER_FAILED",
            userId: "user_deleted",
            userEmail: null,
            essayId: null,
            accessCodeId: null,
            provider: "gemini",
            reasonCode: "upstream_http_error",
            httpStatus: 503,
            quotaWindow: null,
            usageValue: null,
            quotaLimit: null,
            occurrenceCount: 1,
            message: "Correction provider failed.",
          },
        ],
      }),
    );

    expect(markup).toContain(">user_deleted<");
  });

  it("shows an event with no associated user without a link", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminRecentActivityFeed, {
        initialEvents: [
          {
            id: "event_3",
            occurredAt: "2026-09-05T11:45:00.000Z",
            firstOccurredAt: "2026-09-05T11:45:00.000Z",
            severity: "WARN",
            module: "SYSTEM_INTEGRATION",
            eventType: "AUTH_NETWORK_REVIEW_REQUIRED",
            userId: null,
            essayId: null,
            accessCodeId: null,
            provider: null,
            reasonCode: null,
            httpStatus: null,
            quotaWindow: null,
            usageValue: null,
            quotaLimit: null,
            occurrenceCount: 1,
            message: "Possible concurrent access.",
          },
        ],
      }),
    );

    expect(markup).toContain("Possible concurrent access.");
    expect(markup).not.toContain("/admin/users/");
  });

  it("shows an empty state before any event has been recorded", () => {
    const markup = renderToStaticMarkup(createElement(AdminRecentActivityFeed, { initialEvents: [] }));

    expect(markup).toContain("No activity yet.");
  });
});
