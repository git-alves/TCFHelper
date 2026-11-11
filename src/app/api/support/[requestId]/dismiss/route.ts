import { getSupportNoticeUser, supportNoticeOutcomeResponse } from "@/lib/support-notice-route";
import { dismissSupportNotice } from "@/lib/support-resolution";

/**
 * "I don't want to answer" on the resolution notice: declines it with no
 * feedback, for good. (The X and Escape do not call this: they only close the
 * modal, so the learner can answer later.) The ticket stays RESOLVED.
 * Someone else's ticket answers 404; a ticket that is not RESOLVED, whose
 * notice was already answered or declined, or whose 7-day notice has expired
 * answers 409 (not an idempotent 200: a repeat can never change anything, and
 * the caller should know its view was stale).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await getSupportNoticeUser();
  if (!auth.ok) return auth.response;

  const { requestId } = await params;
  return supportNoticeOutcomeResponse(await dismissSupportNotice(auth.user.id, requestId));
}
