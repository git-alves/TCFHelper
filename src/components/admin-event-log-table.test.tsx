import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminEventLogTable } from "./admin-event-log-table";

describe("AdminEventLogTable", () => {
  it("renders a readable structured event with safe context and coalesced occurrence count", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminEventLogTable, {
        events: [
          {
            id: "event_1",
            occurredAt: "2026-08-11T12:30:00.000Z",
            firstOccurredAt: "2026-08-11T12:00:00.000Z",
            severity: "ERROR",
            module: "ESSAY_SERVICE",
            eventType: "CORRECTION_PROVIDER_FAILED",
            userId: "user_1",
            essayId: "essay_1",
            accessCodeId: null,
            provider: "gemini",
            reasonCode: "upstream_http_error",
            httpStatus: 503,
            quotaWindow: null,
            usageValue: null,
            quotaLimit: null,
            occurrenceCount: 4,
            message: "Correction provider failed (gemini, upstream HTTP error, HTTP 503).",
          },
        ],
      }),
    );

    expect(markup).toContain("Correction provider failed");
    expect(markup).toContain("ERROR");
    expect(markup).toContain("AI services");
    expect(markup).toContain("4 occurrences since");
    expect(markup).toContain('href="/admin/users/user_1"');
    expect(markup).toContain("upstream http error");
  });

  it("does not invent a raw-message or metadata column", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminEventLogTable, {
        events: [
          {
            id: "event_2",
            occurredAt: "2026-08-11T12:30:00.000Z",
            firstOccurredAt: "2026-08-11T12:30:00.000Z",
            severity: "WARN",
            module: "QUOTA_ACCESS",
            eventType: "TRANSLATION_QUOTA_DENIED",
            userId: null,
            essayId: null,
            accessCodeId: "access_code_row_1",
            provider: null,
            reasonCode: "minute_request_limit",
            httpStatus: null,
            quotaWindow: "minute",
            usageValue: 10,
            quotaLimit: 10,
            occurrenceCount: 1,
            message: "Translation quota denied (minute limit, 10 / 10 in minute).",
          },
        ],
      }),
    );

    expect(markup).toContain("Access-code record");
    expect(markup).toContain("10 / 10");
    expect(markup).not.toContain("Raw message");
    expect(markup).not.toContain("Metadata");
  });
});
