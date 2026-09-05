import { NextResponse } from "next/server";
import { z } from "zod";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

const MAX_TIMEZONE_LENGTH = 100;

const requestSchema = z.object({ timezone: z.string().min(1).max(MAX_TIMEZONE_LENGTH) }).strict();

/** Rejects anything Intl itself would not accept as an IANA zone name. */
function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Lets the learner's own browser tell us its IANA zone, since nothing on the
 * server can otherwise know it. Any signed-in account may report it --
 * unrelated to activation, unlike most other writes here.
 */
export async function PUT(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentAppUser>>;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return NextResponse.json(
        { error: "Your account is still being set up. Please try again.", code: "ACCOUNT_PROVISIONING_UNAVAILABLE" },
        { status: 503 },
      );
    }
    throw error;
  }

  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isValidTimeZone(parsed.data.timezone)) {
    return NextResponse.json({ error: "Invalid timezone." }, { status: 400 });
  }

  // Conditional on the WHERE clause, not a prior read, so two concurrent
  // reports (e.g. two tabs) can never overwrite each other with a stale
  // decision -- the same skip-if-unchanged shape as touchLastActive.
  await prisma.user.updateMany({
    where: { id: user.id, OR: [{ timezone: null }, { timezone: { not: parsed.data.timezone } }] },
    data: { timezone: parsed.data.timezone },
  });

  return new NextResponse(null, { status: 204 });
}
