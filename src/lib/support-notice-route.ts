import { NextResponse } from "next/server";
import { AppUserProvisioningError, getCurrentAppUser, type AppUser } from "@/lib/app-user";
import type { NoticeActionOutcome } from "@/lib/support-resolution";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export function supportNoticeJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

/**
 * Shared by the learner's notice routes. Support stays available to accounts
 * that are not activated yet, so this only requires a signed-in, unblocked
 * account (not an activated one), like POST /api/support.
 */
export type SupportNoticeAuth = { ok: true; user: AppUser } | { ok: false; response: NextResponse };

export async function getSupportNoticeUser(options?: { skipPresenceTouch?: boolean }): Promise<SupportNoticeAuth> {
  try {
    const user = await getCurrentAppUser(options);
    return user ? { ok: true, user } : { ok: false, response: supportNoticeJson({ error: "Unauthorized" }, 401) };
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return {
        ok: false,
        response: supportNoticeJson(
          { error: "Your account is still being set up. Please try again.", code: "ACCOUNT_PROVISIONING_UNAVAILABLE" },
          503,
        ),
      };
    }
    throw error;
  }
}

export function supportNoticeOutcomeResponse(outcome: NoticeActionOutcome) {
  if (outcome.kind === "ok") return supportNoticeJson({ ok: true, next: outcome.next });
  if (outcome.kind === "notFound") return supportNoticeJson({ error: "Support request not found." }, 404);
  return supportNoticeJson(
    {
      error: "This support request has no pending resolution notice.",
      code: "SUPPORT_NOTICE_NOT_PENDING",
    },
    409,
  );
}
