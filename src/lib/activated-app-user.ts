import "server-only";

import { hasRedeemedAccessCode } from "@/lib/access-code";
import { getCurrentAppUser, type AppUser } from "@/lib/app-user";

/**
 * Resolves a learner who is both authenticated in the application and has
 * redeemed an access code. This is deliberately separate from
 * getCurrentAppUser(): activation must not prevent /activate or its
 * redemption endpoint from resolving a newly provisioned account.
 */
export async function getCurrentActivatedAppUser(): Promise<AppUser | null> {
  const user = await getCurrentAppUser();
  if (!user) return null;

  return (await hasRedeemedAccessCode(user.id)) ? user : null;
}
