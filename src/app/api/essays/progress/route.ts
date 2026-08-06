import { NextResponse } from "next/server";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { getEssayProgressPoints } from "@/lib/essay-progress";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET() {
  let user: Awaited<ReturnType<typeof getCurrentAppUser>>;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return NextResponse.json(
        {
          error: "Your account is still being set up. Please try again.",
          code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
        },
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  // Scoped strictly to the authenticated user's own id -- there is no
  // client-supplied identifier anywhere in this request to trust or reject.
  const points = await getEssayProgressPoints(user.id);

  return NextResponse.json({ points }, { headers: NO_STORE_HEADERS });
}
