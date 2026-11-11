import { getSupportNoticeUser, supportNoticeOutcomeResponse } from "@/lib/support-notice-route";
import { markSupportNoticeSeen } from "@/lib/support-resolution";

/**
 * The learner opened the resolution notice for this ticket. Idempotent: a
 * repeat is a no-op. Someone else's ticket answers 404; a ticket that is not
 * RESOLVED or whose notice was already dismissed answers 409.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  // Opening the modal is a consequence of a page load, not learner activity.
  const auth = await getSupportNoticeUser({ skipPresenceTouch: true });
  if (!auth.ok) return auth.response;

  const { requestId } = await params;
  return supportNoticeOutcomeResponse(await markSupportNoticeSeen(auth.user.id, requestId));
}
