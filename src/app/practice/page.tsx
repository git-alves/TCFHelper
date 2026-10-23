import { redirect } from "next/navigation";
import { PracticeTrainer } from "@/components/practice-trainer";
import { PracticeWalkthroughRunner } from "@/components/practice-walkthrough-runner";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import { SECTIONED_PRACTICE_EXERCISES } from "@/lib/sectioned-practice";

export default async function PracticePage() {
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
    await redirectForUnauthenticatedOrBlockedUser("/practice");
    return null;
  }

  if (!user.isAdmin && !(await hasRedeemedAccessCode(user.id))) {
    redirect("/activate");
  }

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PracticeWalkthroughRunner />
      <PracticeTrainer exercises={SECTIONED_PRACTICE_EXERCISES} />
    </main>
  );
}
