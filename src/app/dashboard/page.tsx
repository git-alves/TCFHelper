import { redirect } from "next/navigation";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { DashboardHeading } from "@/components/dashboard-heading";
import { WritingWorkspace } from "@/components/writing-workspace";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";

export default async function DashboardPage() {
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
    redirect("/login?callbackUrl=/dashboard");
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <DashboardHeading name={user.name ?? user.email} />
      <WritingWorkspace />
    </main>
  );
}
