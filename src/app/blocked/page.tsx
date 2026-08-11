import { redirect } from "next/navigation";
import { BlockedAccountModal } from "@/components/blocked-account-modal";
import { isCurrentRequestBlocked } from "@/lib/blocked-user";

// This is the only place a blocked session can see the account-access modal.
// It must remain server-verified so an ordinary signed-in visitor cannot use
// the public URL to manufacture a suspension-looking screen.
export default async function BlockedPage() {
  // `/blocked` is public, so it must not expose a blocked-account state to
  // an ordinary signed-in learner who opens it directly.
  if (!(await isCurrentRequestBlocked().catch(() => false))) {
    redirect("/");
  }

  return <BlockedAccountModal />;
}
