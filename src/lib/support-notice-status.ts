import { supportNoticeExpiryCutoff } from "@/lib/support-notice-expiry";

export type SupportNoticeStatus =
  | { kind: "answered"; feedback: "WORKED" | "STILL_BROKEN"; at: Date }
  | { kind: "pending"; seenAt: Date | null }
  | { kind: "declined"; at: Date }
  | { kind: "expired" };

interface TicketForNoticeStatus {
  resolvedAt: Date | null;
  noticeSeenAt: Date | null;
  noticeDismissedAt: Date | null;
  resolutionFeedback: "WORKED" | "STILL_BROKEN" | null;
  feedbackAt: Date | null;
}

/**
 * Where the learner stands on a resolved ticket's notice, for the admin list:
 * answered (with what they said), still pending (within the expiry window,
 * with when they first opened it), declined (dismissed with no answer), or
 * expired (never answered or declined, and past the window). Null for a ticket
 * that has never been resolved.
 */
export function getSupportNoticeStatus(ticket: TicketForNoticeStatus, now: Date): SupportNoticeStatus | null {
  if (!ticket.resolvedAt) return null;
  if (ticket.resolutionFeedback && ticket.feedbackAt) {
    return { kind: "answered", feedback: ticket.resolutionFeedback, at: ticket.feedbackAt };
  }
  if (ticket.noticeDismissedAt) return { kind: "declined", at: ticket.noticeDismissedAt };
  if (ticket.resolvedAt > supportNoticeExpiryCutoff(now)) return { kind: "pending", seenAt: ticket.noticeSeenAt };
  return { kind: "expired" };
}
