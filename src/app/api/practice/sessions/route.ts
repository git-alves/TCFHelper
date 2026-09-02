import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { AppUserProvisioningError } from "@/lib/app-user";
import { clearPracticeProgress, createPracticeSession } from "@/lib/practice-progress";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

const requestSchema = z
  .object({
    task: z.enum(["TASK_1", "TASK_2", "TASK_3"]),
    level: z.enum(["B2", "C1", "C2"]),
    skillId: z.string().min(1).max(120),
    exerciseIds: z.array(z.string().min(1).max(160)).length(6),
  })
  .strict();

export async function POST(request: Request) {
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
    return NextResponse.json({ error: "Invalid practice session." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const session = await createPracticeSession(user.id, parsed.data);
  if (!session) {
    // The server validates the fixed curriculum selection too. This is a
    // malformed or stale client state, not a not-found response that could
    // reveal anything about another learner's activity.
    return NextResponse.json({ error: "Invalid practice session." }, { status: 400, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ sessionId: session.id }, { status: 201, headers: NO_STORE_HEADERS });
}

/** Clears every recorded Practice session for the caller so they can redo completed exercises. */
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
        { status: 503, headers: NO_STORE_HEADERS },
      );
    }
    throw error;
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  await clearPracticeProgress(user.id);
  return new NextResponse(null, { status: 204, headers: NO_STORE_HEADERS });
}
