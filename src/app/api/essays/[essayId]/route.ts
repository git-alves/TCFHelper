import { NextResponse } from "next/server";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { AppUserProvisioningError } from "@/lib/app-user";
import { deleteCorrectionForUser } from "@/lib/correction-history";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ essayId: string }> }
) {
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

  const { essayId } = await params;
  const deleted = await deleteCorrectionForUser(user.id, essayId);
  if (!deleted) {
    return NextResponse.json({ error: "Correction not found." }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
