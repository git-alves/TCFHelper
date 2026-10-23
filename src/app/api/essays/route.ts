import { NextResponse } from "next/server";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { AppUserProvisioningError } from "@/lib/app-user";
import { deleteAllCorrectionsForUser } from "@/lib/correction-history";

export async function DELETE() {
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

  await deleteAllCorrectionsForUser(user.id);
  return new NextResponse(null, { status: 204 });
}
