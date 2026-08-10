import { redirect } from "next/navigation";
import { BlockedSessionSignOut } from "@/components/blocked-session-sign-out";
import { isCurrentRequestBlocked } from "@/lib/blocked-user";

// This route deliberately says nothing about why the session is being ended.
// It is only a brief client-side bridge that clears Clerk before public
// navigation, preventing a protected-page → login → protected-page loop.
export default async function BlockedPage() {
  // `/blocked` is a public URL, so it must not become a surprise logout
  // endpoint for an ordinary signed-in learner who enters it directly.
  if (!(await isCurrentRequestBlocked().catch(() => false))) {
    redirect("/");
  }

  return <BlockedSessionSignOut />;
}
