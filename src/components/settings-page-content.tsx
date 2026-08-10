import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { AccountUnavailableMessage } from "@/components/account-unavailable-message";
import { SettingsForm } from "@/components/settings-form";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import { resolveSettingsProfile } from "@/lib/settings-profile";

// Shared by the full /settings page and its intercepted-route modal so
// neither can drift from the other's auth gating or Clerk/local profile
// resolution.
export async function SettingsPageContent() {
  let user;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return <AccountUnavailableMessage />;
    }
    throw error;
  }

  if (!user) {
    await redirectForUnauthenticatedOrBlockedUser("/settings");
    return null;
  }

  if (!user.isAdmin && !(await hasRedeemedAccessCode(user.id))) {
    redirect("/activate");
  }

  // Clerk's own profile is the account the learner actually signed in with,
  // and the only source with an OAuth avatar; the app's local user record
  // intentionally stores just what grading/ownership needs, so it's the
  // fallback rather than the primary source.
  const clerkUser = await currentUser();
  const profile = resolveSettingsProfile(
    { name: user.name, email: user.email },
    clerkUser
      ? {
          fullName: clerkUser.fullName,
          primaryEmail: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          hasImage: clerkUser.hasImage,
          imageUrl: clerkUser.imageUrl,
        }
      : null,
  );

  return <SettingsForm name={profile.name} email={profile.email} avatarUrl={profile.avatarUrl} />;
}
