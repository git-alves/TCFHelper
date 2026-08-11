import "server-only";

import { getCurrentClerkUserId } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

/**
 * This intentionally does not provision a local user. It is only used by the
 * public browser entry points to distinguish a blocked, still-valid Clerk
 * session from a genuinely signed-out visitor and route it to the verified
 * recovery modal before Clerk can follow a protected-page callback back into
 * a loop.
 */
export async function isCurrentRequestBlocked(): Promise<boolean> {
  const clerkUserId = await getCurrentClerkUserId();
  if (!clerkUserId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { isBlocked: true },
  });

  return user?.isBlocked === true;
}
