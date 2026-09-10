import { NextResponse } from "next/server";
import { z } from "zod";
import { AppUserProvisioningError } from "@/lib/app-user";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { recordAdminEvent } from "@/lib/admin-events";
import { isSpellCheckRateLimited } from "@/lib/spell-check-rate-limit";
import { checkFrenchSpelling, type SpellCheckMatch } from "@/lib/spell-check";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
// Mirrors the essay editor's own maxLength so the endpoint never accepts
// text the editor cannot produce.
const MAX_TEXT_LENGTH = 20_000;
const requestSchema = z.object({ text: z.string().max(MAX_TEXT_LENGTH) }).strict();

function jsonResponse(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE_HEADERS, ...headers } });
}

/**
 * Checks French spelling using the bundled Hunspell dictionary. This route is
 * intentionally local-only: it makes no network request and never sends a
 * learner's draft to an external spelling or AI service.
 */
export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentActivatedAppUser>>;
  try {
    user = await getCurrentActivatedAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return jsonResponse(
        { error: "Your account is still being set up. Please try again.", code: "ACCOUNT_PROVISIONING_UNAVAILABLE" },
        503,
      );
    }
    throw error;
  }

  if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: "Invalid request." }, 400);

  const { text } = parsed.data;
  if (!text.trim()) return jsonResponse({ errors: [] });

  if (isSpellCheckRateLimited(user.id)) {
    return jsonResponse(
      { error: "Too many spell-check requests. Please slow down.", code: "SPELL_CHECK_RATE_LIMITED" },
      429,
      { "Retry-After": "10" },
    );
  }

  let errors: SpellCheckMatch[];
  try {
    errors = checkFrenchSpelling(text);
  } catch (error) {
    // A bundled dictionary failure is operationally useful to an admin, but
    // never contains draft text or an implementation exception in the event.
    console.error("Bundled French spell checker failed", error);
    await recordAdminEvent({
      eventType: "SPELL_CHECK_FAILED",
      userId: user.id,
      provider: "hunspell",
      reasonCode: "provider_unavailable",
      httpStatus: 500,
    });
    return jsonResponse(
      { error: "Spell check is temporarily unavailable.", code: "SPELL_CHECK_UNAVAILABLE" },
      500,
    );
  }

  return jsonResponse({ errors });
}
