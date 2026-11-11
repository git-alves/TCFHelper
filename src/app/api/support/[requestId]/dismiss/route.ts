import { getSupportNoticeUser, supportNoticeOutcomeResponse } from "@/lib/support-notice-route";
import { dismissSupportNotice } from "@/lib/support-resolution";

/**
 * The X on the resolution notice: closes it with no feedback, for good. The
 * ticket stays RESOLVED. Someone else's ticket answers 404; a ticket that is
 * not RESOLVED or whose notice was already answered or dismissed answers 409
 * (not an idempotent 200: a repeat can never change anything, and the caller
 * should know its view was stale).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await getSupportNoticeUser();
  if (!auth.ok) return auth.response;

  const { requestId } = await params;
  return supportNoticeOutcomeResponse(await dismissSupportNotice(auth.user.id, requestId));
}
