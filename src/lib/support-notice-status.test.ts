import { describe, expect, it } from "vitest";
import { getSupportNoticeStatus } from "./support-notice-status";

const NOW = new Date("2026-11-12T10:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms: number) => new Date(NOW.getTime() - ms);

function ticket(overrides: Partial<Parameters<typeof getSupportNoticeStatus>[0]> = {}) {
  return {
    resolvedAt: ago(DAY),
    noticeSeenAt: null,
    noticeDismissedAt: null,
    resolutionFeedback: null,
    feedbackAt: null,
    ...overrides,
  };
}

describe("getSupportNoticeStatus", () => {
  it("is null for a ticket that was never resolved", () => {
    expect(getSupportNoticeStatus(ticket({ resolvedAt: null }), NOW)).toBeNull();
  });

  it.each(["WORKED", "STILL_BROKEN"] as const)("answered %s, with the time of the answer", (feedback) => {
    const at = ago(60 * 1000);

    expect(
      getSupportNoticeStatus(ticket({ resolutionFeedback: feedback, feedbackAt: at, noticeDismissedAt: at }), NOW),
    ).toEqual({ kind: "answered", feedback, at });
  });

  it("an answer wins, even long after the window", () => {
    const at = ago(30 * DAY);

    expect(
      getSupportNoticeStatus(ticket({ resolvedAt: ago(31 * DAY), resolutionFeedback: "WORKED", feedbackAt: at }), NOW),
    ).toMatchObject({ kind: "answered" });
  });

  it("not answered yet while within 7 days, with whether and when the learner opened it", () => {
    expect(getSupportNoticeStatus(ticket(), NOW)).toEqual({ kind: "pending", seenAt: null });

    const seenAt = ago(2 * DAY);
    expect(getSupportNoticeStatus(ticket({ noticeSeenAt: seenAt }), NOW)).toEqual({ kind: "pending", seenAt });
  });

  it("declined when it was dismissed without feedback, with the time", () => {
    const at = ago(DAY);

    expect(getSupportNoticeStatus(ticket({ noticeDismissedAt: at, noticeSeenAt: ago(2 * DAY) }), NOW)).toEqual({
      kind: "declined",
      at,
    });
  });

  it("a decline is shown as declined, not expired, even after the window", () => {
    const at = ago(20 * DAY);

    expect(getSupportNoticeStatus(ticket({ resolvedAt: ago(30 * DAY), noticeDismissedAt: at }), NOW)).toEqual({
      kind: "declined",
      at,
    });
  });

  it("expired when more than 7 days passed with no answer and no decline", () => {
    expect(getSupportNoticeStatus(ticket({ resolvedAt: ago(8 * DAY) }), NOW)).toEqual({ kind: "expired" });
    expect(getSupportNoticeStatus(ticket({ resolvedAt: ago(8 * DAY), noticeSeenAt: ago(7 * DAY) }), NOW)).toEqual({
      kind: "expired",
    });
  });

  it("the boundary matches the learner's query: 6 days 23 hours is pending, exactly 7 days is expired", () => {
    expect(getSupportNoticeStatus(ticket({ resolvedAt: ago(6 * DAY + 23 * 60 * 60 * 1000) }), NOW)).toMatchObject({
      kind: "pending",
    });
    expect(getSupportNoticeStatus(ticket({ resolvedAt: ago(7 * DAY) }), NOW)).toEqual({ kind: "expired" });
    expect(getSupportNoticeStatus(ticket({ resolvedAt: ago(7 * DAY + 1000) }), NOW)).toEqual({ kind: "expired" });
  });
});
