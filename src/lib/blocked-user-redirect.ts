import "server-only";

import { redirect } from "next/navigation";
import { getCurrentClerkUserId } from "@/lib/app-user";

/**
 * getCurrentAppUser() deliberately returns null for both anonymous and
 * blocked sessions so learner APIs do not reveal account state. Pages send a
 * blocked Clerk session to the verified recovery modal, which ends the
 * session only after the person closes it; otherwise Clerk can immediately
 * follow a login callback back to the protected page.
 */
export async function redirectForUnauthenticatedOrBlockedUser(callbackPath: string): Promise<never> {
  if (await getCurrentClerkUserId()) {
    redirect("/blocked");
  }

  redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
}
