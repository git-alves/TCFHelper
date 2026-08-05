import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { SettingsForm } from "@/components/settings-form";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { resolveSettingsProfile } from "@/lib/settings-profile";

export default async function SettingsPage() {
  let user;
  try {
    user = await getCurrentAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return <DashboardAccountUnavailable />;
    }
    throw error;
  }

  if (!user) {
    redirect("/login?callbackUrl=/settings");
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <SettingsForm name={profile.name} email={profile.email} avatarUrl={profile.avatarUrl} />
    </main>
  );
}
