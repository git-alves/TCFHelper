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

  // The one owner needs to reach both /admin and the learner workspace before
  // an invitation exists. Do not make that account consume a single-use code
  // merely to test the product it operates.
  if (user.isAdmin) return user;

  return (await hasRedeemedAccessCode(user.id)) ? user : null;
}
