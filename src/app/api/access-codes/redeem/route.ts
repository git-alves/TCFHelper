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
    return response({ activated: true });
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
