import { AccountUnavailableMessage } from "@/components/account-unavailable-message";
import { SupportForm } from "@/components/support-form";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";

// Shared by the full /support page and its intercepted-route modal so email
// resolution and account gating stay identical in both entry points.
export async function SupportPageContent() {
  let user;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) return <AccountUnavailableMessage />;
    throw error;
  }

  if (!user) {
    await redirectForUnauthenticatedOrBlockedUser("/support");
    return null;
  }

  // Unlike the learning workspace, Support deliberately remains available to
  // unactivated accounts: "Account & access" is how a learner can resolve
  // an activation problem without already having access to the product.
  return <SupportForm email={user.email} name={user.name} />;
}
