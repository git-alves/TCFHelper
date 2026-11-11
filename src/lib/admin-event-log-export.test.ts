import { describe, expect, it } from "vitest";
import type { AdminEventLogItem } from "@/lib/admin-event-log";
import { adminEventLogExportFilename, formatAdminEventLogTxt } from "./admin-event-log-export";

function event(overrides: Partial<AdminEventLogItem> = {}): AdminEventLogItem {
  return {
    id: "cevent000000000000000000001",
    occurredAt: "2026-11-14T09:12:03.456Z",
    firstOccurredAt: "2026-11-14T09:12:03.456Z",
    severity: "ERROR",
    module: "ESSAY_SERVICE",
    eventType: "CORRECTION_PROVIDER_FAILED",
    userId: "cuser0000000000000000000001",
    essayId: null,
    accessCodeId: null,
    provider: "gemini",
    model: "gemini-3.5-flash-lite",
    reasonCode: "output_truncated",
    httpStatus: 502,
    quotaWindow: null,
    usageValue: null,
    quotaLimit: null,
    occurrenceCount: 1,
    message: "Correction generation failed (gemini): output truncated.",
    userEmail: "learner@example.com",
    ...overrides,
  };
}

const FILTERS: Parameters<typeof formatAdminEventLogTxt>[0]["filters"] = {
  range: "last-7-days",
  severity: "ERROR",
  module: null,
  q: "",
  start: new Date("2026-11-07T10:32:05.000Z"),
  end: new Date("2026-11-14T10:32:05.000Z"),
};
const GENERATED = new Date("2026-11-14T10:32:05.789Z");
const CUTOFF = "2026-10-15T10:32:05.789Z";

function format(events: AdminEventLogItem[], filters = FILTERS) {
  return formatAdminEventLogTxt({ events, filters, generatedAt: GENERATED, retentionCutoff: CUTOFF });
}

describe("adminEventLogExportFilename", () => {
  it("is tcflab-logs-YYYY-MM-DD-HHmm.txt in UTC", () => {
    expect(adminEventLogExportFilename(new Date("2026-11-14T09:05:59.000Z"))).toBe("tcflab-logs-2026-11-14-0905.txt");
    expect(adminEventLogExportFilename(new Date("2026-01-02T23:59:00.000Z"))).toBe("tcflab-logs-2026-01-02-2359.txt");
  });
});

describe("formatAdminEventLogTxt", () => {
  it("opens with the generation time, the filters in words, the event count and the retention cutoff", () => {
    const header = format([event()]).split("\n\n")[0];

    expect(header).toBe(
      [
        "TCFLab operational log export",
        "Generated: 2026-11-14 10:32:05 UTC",
        "Time range: Last 7 days (2026-11-07 10:32:05 UTC to now)",
        "Level: ERROR",
        "Area: all areas",
        "Search: none",
        "Events: 1 (newest first)",
        "Retention cutoff: 2026-10-15 10:32:05 UTC",
      ].join("\n"),
    );
  });

  it("describes a custom range with both ends, an area, and a search", () => {
    const header = format([], {
      range: "custom",
      severity: null,
      module: "AUTH_SECURITY",
      q: "learner@example.com",
      start: new Date("2026-11-01T00:00:00.000Z"),
      end: new Date("2026-11-02T12:30:00.000Z"),
    }).split("\n\n")[0];

    expect(header).toContain("Time range: Custom range (2026-11-01 00:00:00 UTC to 2026-11-02 12:30:00 UTC)");
    expect(header).toContain("Level: all levels");
    expect(header).toContain("Area: Authentication");
    expect(header).toContain("Search: “learner@example.com”");
  });

  it("writes one block per event with the fields the page shows, in UTC", () => {
    expect(format([event()])).toContain(
      [
        "2026-11-14 09:12:03 UTC | ERROR | AI services",
        "Correction generation failed (gemini): output truncated.",
        "Event type: CORRECTION_PROVIDER_FAILED",
        "User: learner@example.com",
        "Provider: gemini",
        "Model: gemini-3.5-flash-lite",
        "Reason: output truncated",
        "HTTP status: 502",
      ].join("\n"),
    );
  });

  it("omits fields that do not apply instead of writing null, undefined or blanks", () => {
    const text = format([
      event({ userId: null, userEmail: null, provider: null, model: null, reasonCode: null, httpStatus: null, message: "Access code activated successfully." , eventType: "ACCESS_CODE_REDEEMED", severity: "INFO", module: "QUOTA_ACCESS" }),
    ]);
    const block = text.trimEnd().split("\n\n")[1];

    expect(block).toBe(
      [
        "2026-11-14 09:12:03 UTC | INFO | Quotas & access",
        "Access code activated successfully.",
        "Event type: ACCESS_CODE_REDEEMED",
      ].join("\n"),
    );
    expect(text).not.toMatch(/null|undefined|NaN/);
  });

  it("falls back to the user id when the account's email is no longer known, like the page", () => {
    expect(format([event({ userEmail: null })])).toContain("User: cuser0000000000000000000001");
  });

  it("includes the quota and session context the page shows", () => {
    const text = format([
      event({ quotaWindow: "day", usageValue: 3, quotaLimit: 3, essayId: "cessay00000000000000000001" }),
      event({ id: "cevent000000000000000000002", maskedIp: "203.0.113.*", browserFamily: "Firefox", deviceClass: "DESKTOP" }),
    ]);

    expect(text).toContain("Essay: cessay00000000000000000001");
    expect(text).toContain("day quota: 3 / 3");
    expect(text).toContain("Network: 203.0.113.*");
    expect(text).toContain("Device: Firefox on desktop");
  });

  it("shows the occurrence count with its first and last time only when it is more than one", () => {
    const once = format([event({ occurrenceCount: 1 })]);
    const many = format([event({ occurrenceCount: 4, firstOccurredAt: "2026-11-14T08:00:00.000Z" })]);

    expect(once).not.toContain("Occurrences:");
    expect(many).toContain("Occurrences: 4 (first 2026-11-14 08:00:00 UTC, last 2026-11-14 09:12:03 UTC)");
  });

  it("keeps the order it is given (newest first) and separates blocks with one blank line", () => {
    const text = format([
      event({ id: "cevent000000000000000000003", occurredAt: "2026-11-14T09:00:00.000Z", message: "Newest." }),
      event({ id: "cevent000000000000000000002", occurredAt: "2026-11-14T08:00:00.000Z", message: "Older." }),
      event({ id: "cevent000000000000000000001", occurredAt: "2026-11-14T07:00:00.000Z", message: "Oldest." }),
    ]);

    expect(text.indexOf("Newest.")).toBeLessThan(text.indexOf("Older."));
    expect(text.indexOf("Older.")).toBeLessThan(text.indexOf("Oldest."));
    const blocks = text.trimEnd().split("\n\n");
    expect(blocks).toHaveLength(4); // header + 3 events
    expect(blocks[1]).toContain("Newest.");
    expect(text.endsWith("\n")).toBe(true);
    expect(text).not.toContain("\n\n\n");
  });

  it("keeps every value on one line, so a stray line break cannot fake a field or a block", () => {
    const text = format([event({ model: "weird\nReason: forged\r\nHTTP status: 200", message: "Line one\n\nEvent type: FAKE" })]);

    expect(text).not.toContain("\nReason: forged");
    expect(text.split("\n\n")).toHaveLength(2);
  });

  it("says so when nothing matches", () => {
    const text = format([]);

    expect(text).toContain("Events: 0 (newest first)");
    expect(text).toContain("No events match these filters.");
  });

  it("stays well under the size budget the cap assumes, even with every field present", () => {
    const full = event({
      userEmail: "a.very.long.learner.address@example-university-long-domain.edu",
      model: "m".repeat(200),
      essayId: "cessay00000000000000000001",
      accessCodeId: "caccess0000000000000000001",
      quotaWindow: "month",
      usageValue: 1234567,
      quotaLimit: 2345678,
      maskedIp: "203.0.113.*",
      browserFamily: "Firefox",
      deviceClass: "DESKTOP",
      occurrenceCount: 12345,
    });

    // One block, not the header: the cap assumes well under 800 bytes each.
    expect(format([full]).trimEnd().split("\n\n")[1].length).toBeLessThan(800);
  });
});
