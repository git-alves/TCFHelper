import { NextResponse } from "next/server";
import { z } from "zod";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { normalizeAccessCode, redeemAccessCode } from "@/lib/access-code";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

const requestSchema = z
  .object({
    code: z.string().trim().min(1).max(128),
  })
  .strict();

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentAppUser>>;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return response(
        {
          error: "Your account is still being set up. Please try again.",
          code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
        },
        503,
      );
    }
    throw error;
  }

  if (!user) {
    return response({ error: "Unauthorized" }, 401);
  }

  // The sole owner is activation-exempt. Returning the same success shape
  // prevents a pasted code from consuming an invite the owner does not need.
  if (user.isAdmin) {
    return response({ activated: true, isNewUser: user.walkthroughCompletedVersion === null });
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return response({ error: "Enter a valid access code.", code: "INVALID_ACCESS_CODE" }, 400);
  }

  try {
    const result = await redeemAccessCode(user.id, normalizeAccessCode(parsed.data.code));
    if (result.kind === "invalid") {
      // Deliberately collapse a missing code and one already redeemed by
      // someone else. A code must not become an account-enumeration oracle.
      return response(
        {
          error: "That access code is invalid or has already been redeemed.",
          code: "ACCESS_CODE_INVALID",
        },
        400,
      );
    }

    // Redeeming twice from a double-click or stale tab is a harmless,
    // successful activation. This also keeps the browser flow idempotent.
    // A learner who never started the walkthrough is treated as new -- the
    // welcome modal's CTA sends them to the dashboard so it can auto-start,
    // rather than to tasks where no tour would greet them.
    return response({ activated: true, isNewUser: user.walkthroughCompletedVersion === null });
  } catch {
    // Do not let a database outage turn into an unmetered/partially recorded
    // activation. The learner can safely retry because redemption is atomic.
    console.error("Access-code redemption failed");
    return response(
      {
        error: "Access-code activation is temporarily unavailable. Please try again.",
        code: "ACCESS_CODE_REDEMPTION_UNAVAILABLE",
      },
      503,
    );
  }
}
