import { z } from "zod";
import { getSupportNoticeUser, supportNoticeJson, supportNoticeOutcomeResponse } from "@/lib/support-notice-route";
import { SUPPORT_RESOLUTION_FEEDBACK_VALUES, answerSupportNotice } from "@/lib/support-resolution";

const feedbackSchema = z.object({ feedback: z.enum(SUPPORT_RESOLUTION_FEEDBACK_VALUES) }).strict();

/**
 * The learner's answer to a resolution notice: WORKED or STILL_BROKEN
 * (which reopens the ticket). It also dismisses the notice. Someone else's
 * ticket answers 404; a ticket that is not RESOLVED or whose notice was
 * already answered or dismissed answers 409, so an answer is never overwritten.
 */
export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const auth = await getSupportNoticeUser();
  if (!auth.ok) return auth.response;

  const parsed = feedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return supportNoticeJson({ error: "Invalid feedback." }, 400);

  const { requestId } = await params;
  return supportNoticeOutcomeResponse(await answerSupportNotice(auth.user.id, requestId, parsed.data.feedback));
}
