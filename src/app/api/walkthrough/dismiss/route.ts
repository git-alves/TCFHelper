import { NextResponse } from "next/server";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { AppUserProvisioningError } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { CURRENT_WALKTHROUGH_VERSION } from "@/lib/walkthrough";

// One meaning for both outcomes: whether the learner finished every step or
// skipped partway through, the walkthrough should not auto-start again for
// this version either way. "Take a tour" (a manual re-trigger) covers anyone
// who wants to see it again.
export async function POST() {
  let user: Awaited<ReturnType<typeof getCurrentActivatedAppUser>>;
  try {
    user = await getCurrentActivatedAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return NextResponse.json(
        {
          error: "Your account is still being set up. Please try again.",
          code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { walkthroughCompletedVersion: CURRENT_WALKTHROUGH_VERSION },
  });

  return new NextResponse(null, { status: 204 });
}
