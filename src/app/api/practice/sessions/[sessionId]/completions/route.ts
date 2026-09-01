import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { AppUserProvisioningError } from "@/lib/app-user";
import { recordPracticeCompletion } from "@/lib/practice-progress";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

const requestSchema = z
  .object({
    exerciseId: z.string().min(1).max(160),
    completionMethod: z.enum(["correct", "self-review", "revealed"]),
  })
  .strict();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
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
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid exercise completion." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { sessionId } = await params;
  const result = await recordPracticeCompletion(user.id, sessionId, parsed.data.exerciseId, parsed.data.completionMethod);
  if (result.kind === "not-found") {
    // A session ID is private learner activity. Do not distinguish a valid
    // session owned by someone else from an absent one.
    return NextResponse.json({ error: "Practice session not found." }, { status: 404, headers: NO_STORE_HEADERS });
  }
  if (result.kind === "invalid") {
    return NextResponse.json({ error: "Invalid exercise completion." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json(
    { sequenceCompleted: result.sequenceCompleted },
    { status: 201, headers: NO_STORE_HEADERS },
  );
}
