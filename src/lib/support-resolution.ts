import type { SupportResolutionFeedback } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export { SUPPORT_RESOLUTION_NOTE_MAX_CHARS } from "@/lib/support-resolution-limits";
export const SUPPORT_RESOLUTION_FEEDBACK_VALUES = ["WORKED", "STILL_BROKEN"] as const satisfies readonly SupportResolutionFeedback[];

/**
 * What the learner's notice needs and nothing more: never the request's
 * details or attachment. resolvedAt is an ISO string so the value can cross
 * the server/client boundary and be returned from a route as is.
 */
export interface SupportResolutionNotice {
  id: string;
  ticketNumber: number;
  resolutionNote: string | null;
  resolvedAt: string;
}

const NOTICE_SELECT = { id: true, ticketNumber: true, resolutionNote: true, resolvedAt: true } as const;

// Served by the partial index SupportRequest_pendingNotice_idx
// (userId, resolvedAt, ticketNumber) WHERE status = 'RESOLVED' AND
// noticeDismissedAt IS NULL: the oldest resolution first, then the lowest
// ticket number.
const PENDING_NOTICE_WHERE = (userId: string) =>
  ({ userId, status: "RESOLVED", noticeDismissedAt: null }) as const;
const PENDING_NOTICE_ORDER = [{ resolvedAt: "asc" }, { ticketNumber: "asc" }] as const;

function toNotice(row: { id: string; ticketNumber: number; resolutionNote: string | null; resolvedAt: Date | null }) {
  // A RESOLVED row always has resolvedAt; the guard keeps a malformed row out
  // of the notice instead of rendering an invalid date.
  if (!row.resolvedAt) return null;
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    resolutionNote: row.resolutionNote,
    resolvedAt: row.resolvedAt.toISOString(),
  } satisfies SupportResolutionNotice;
}

/** The learner's oldest unanswered resolution notice, or null when none is pending. */
export async function getPendingSupportNotice(userId: string): Promise<SupportResolutionNotice | null> {
  const row = await prisma.supportRequest.findFirst({
    where: PENDING_NOTICE_WHERE(userId),
    orderBy: [...PENDING_NOTICE_ORDER],
    select: NOTICE_SELECT,
  });
  return row ? toNotice(row) : null;
}

export type ResolveOutcome = { kind: "resolved"; ticketNumber: number } | { kind: "notFound" } | { kind: "alreadyResolved" };

/**
 * Marks an OPEN request resolved. Resolving a request again after the learner
 * reported STILL_BROKEN starts a new cycle: the notice, its seen/dismissed
 * state and the earlier feedback are cleared so the learner gets a fresh
 * notice and the admin sees only the current cycle's answer. The conditional
 * update means two admins resolving at once cannot both succeed.
 */
export async function resolveSupportRequest(
  requestId: string,
  note: string | null,
  now = new Date(),
): Promise<ResolveOutcome> {
  const updated = await prisma.supportRequest.updateMany({
    where: { id: requestId, status: "OPEN" },
    data: {
      status: "RESOLVED",
      resolvedAt: now,
      resolutionNote: note,
      noticeSeenAt: null,
      noticeDismissedAt: null,
      resolutionFeedback: null,
      feedbackAt: null,
    },
  });
  if (updated.count === 1) {
    const request = await prisma.supportRequest.findUnique({ where: { id: requestId }, select: { ticketNumber: true } });
    return { kind: "resolved", ticketNumber: request?.ticketNumber ?? 0 };
  }

  const existing = await prisma.supportRequest.findUnique({ where: { id: requestId }, select: { id: true } });
  return existing ? { kind: "alreadyResolved" } : { kind: "notFound" };
}

export type NoticeActionOutcome =
  | { kind: "ok"; next: SupportResolutionNotice | null }
  // Not the caller's request (or no such request): reported as 404 so a
  // learner cannot probe for other people's ticket ids.
  | { kind: "notFound" }
  // The caller's own request, but it is not RESOLVED or its notice was
  // already answered or dismissed.
  | { kind: "notPending" };

async function classifyMissedUpdate(userId: string, requestId: string): Promise<NoticeActionOutcome> {
  const owned = await prisma.supportRequest.findFirst({ where: { id: requestId, userId }, select: { id: true } });
  return owned ? { kind: "notPending" } : { kind: "notFound" };
}

/** Records that the learner opened the notice. Idempotent: a repeat is a no-op, not an error. */
export async function markSupportNoticeSeen(userId: string, requestId: string, now = new Date()): Promise<NoticeActionOutcome> {
  const updated = await prisma.supportRequest.updateMany({
    where: { ...PENDING_NOTICE_WHERE(userId), id: requestId, noticeSeenAt: null },
    data: { noticeSeenAt: now },
  });
  if (updated.count === 1) return { kind: "ok", next: null };

  // Either already seen (fine) or not pending / not theirs.
  const pending = await prisma.supportRequest.findFirst({
    where: { ...PENDING_NOTICE_WHERE(userId), id: requestId },
    select: { id: true },
  });
  if (pending) return { kind: "ok", next: null };
  return classifyMissedUpdate(userId, requestId);
}

/**
 * The learner's answer. WORKED keeps the request RESOLVED; STILL_BROKEN puts
 * it back to OPEN, keeping resolvedAt, the note and the answer. Either way the
 * notice is dismissed. The conditional update means an answer can only be
 * recorded once per notice: a second one is "notPending", never an overwrite.
 */
export async function answerSupportNotice(
  userId: string,
  requestId: string,
  feedback: SupportResolutionFeedback,
  now = new Date(),
): Promise<NoticeActionOutcome> {
  const updated = await prisma.supportRequest.updateMany({
    where: { ...PENDING_NOTICE_WHERE(userId), id: requestId },
    data: {
      resolutionFeedback: feedback,
      feedbackAt: now,
      noticeDismissedAt: now,
      ...(feedback === "STILL_BROKEN" ? { status: "OPEN" as const } : {}),
    },
  });
  if (updated.count === 0) return classifyMissedUpdate(userId, requestId);
  return { kind: "ok", next: await getPendingSupportNotice(userId) };
}

/** The X: closes the notice without an answer, for good. */
export async function dismissSupportNotice(userId: string, requestId: string, now = new Date()): Promise<NoticeActionOutcome> {
  const updated = await prisma.supportRequest.updateMany({
    where: { ...PENDING_NOTICE_WHERE(userId), id: requestId },
    data: { noticeDismissedAt: now },
  });
  if (updated.count === 0) return classifyMissedUpdate(userId, requestId);
  return { kind: "ok", next: await getPendingSupportNotice(userId) };
}
