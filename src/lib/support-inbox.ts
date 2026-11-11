import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPendingSupportNotice, type SupportResolutionNotice } from "@/lib/support-resolution";

export type NewTicketKind = "new" | "reopened";

interface TicketForInbox {
  status: "OPEN" | "RESOLVED";
  createdAt: Date;
  resolutionFeedback: "WORKED" | "STILL_BROKEN" | null;
  feedbackAt: Date | null;
}

/**
 * Which open tickets are new to the admin since `seenAt` (her last visit to
 * /admin/support): opened after it, or reopened by the learner ("I still have
 * the problem") after it. A resolved ticket never counts, and a reopening she
 * has already seen does not either. With no recorded visit (null) every open
 * ticket counts.
 */
export function supportInboxNewWhere(seenAt: Date | null): Prisma.SupportRequestWhereInput {
  if (seenAt === null) return { status: "OPEN" };
  return {
    status: "OPEN",
    OR: [
      { createdAt: { gt: seenAt } },
      { resolutionFeedback: "STILL_BROKEN", feedbackAt: { gt: seenAt } },
    ],
  };
}

/**
 * The same rule as supportInboxNewWhere, for tagging one ticket in the list.
 * A ticket opened after the last visit is "new" even if it was also reopened;
 * otherwise a learner reopening makes it "reopened".
 */
export function classifyNewTicket(ticket: TicketForInbox, seenAt: Date | null): NewTicketKind | null {
  if (ticket.status !== "OPEN") return null;
  const reopened = ticket.resolutionFeedback === "STILL_BROKEN" && ticket.feedbackAt !== null;
  if (seenAt === null) return reopened ? "reopened" : "new";
  if (ticket.createdAt > seenAt) return "new";
  if (reopened && ticket.feedbackAt! > seenAt) return "reopened";
  return null;
}

export async function getSupportInboxSeenAt(adminUserId: string): Promise<Date | null> {
  const row = await prisma.user.findUnique({ where: { id: adminUserId }, select: { supportInboxSeenAt: true } });
  return row?.supportInboxSeenAt ?? null;
}

/**
 * The number behind the admin's nav bell and sidebar badge. Two indexed
 * lookups for one account on a full page load: her last-visit time, then a
 * count over the (small) ticket table. No new index: SupportRequest only
 * grows by the tickets learners send, and only one account ever runs this.
 */
export async function getSupportInboxCount(adminUserId: string): Promise<number> {
  const seenAt = await getSupportInboxSeenAt(adminUserId);
  return prisma.supportRequest.count({ where: supportInboxNewWhere(seenAt) });
}

/**
 * Records a committed visit to the support inbox and returns the stored
 * last-visit time.
 *
 * `requested` is the render timestamp the page handed to the browser: using it
 * (rather than the moment this runs) keeps a ticket that arrived while the
 * page was rendering counted as new. It is never trusted blindly: it cannot be
 * in the future (it is clamped to `now`), and the update is conditional, so a
 * stale or repeated request can never move the stored time backwards. With no
 * `requested` the visit is stamped `now`. Repeating a request is harmless.
 */
export async function recordSupportInboxVisit(
  adminUserId: string,
  requested: Date | null,
  now = new Date(),
): Promise<Date> {
  const visitedAt = requested !== null && requested < now ? requested : now;

  await prisma.user.updateMany({
    where: {
      id: adminUserId,
      OR: [{ supportInboxSeenAt: null }, { supportInboxSeenAt: { lt: visitedAt } }],
    },
    data: { supportInboxSeenAt: visitedAt },
  });

  return (await getSupportInboxSeenAt(adminUserId)) ?? visitedAt;
}

export interface NavSupportState {
  /** The learner's oldest unanswered resolution notice (any signed-in user). */
  supportNotice: SupportResolutionNotice | null;
  /** New support tickets for the admin's bell; null for everyone else, and when the count failed. */
  adminSupportCount: number | null;
}

/**
 * Everything the nav's support icons need, resolved once per full page load by
 * the root layout. The admin count query runs only for an admin account; each
 * lookup fails soft (no dot, no badge) rather than failing the page.
 */
export async function getNavSupportState(user: { id: string; isAdmin: boolean } | null): Promise<NavSupportState> {
  if (!user) return { supportNotice: null, adminSupportCount: null };

  const [supportNotice, adminSupportCount] = await Promise.all([
    getPendingSupportNotice(user.id).catch(() => null),
    user.isAdmin ? getSupportInboxCount(user.id).catch(() => null) : Promise.resolve(null),
  ]);
  return { supportNotice, adminSupportCount };
}
