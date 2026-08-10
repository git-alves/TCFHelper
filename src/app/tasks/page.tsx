import { redirect } from "next/navigation";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { TasksWalkthroughRunner } from "@/components/tasks-walkthrough-runner";
import { WalkthroughWorkspaceScriptProvider } from "@/components/walkthrough-workspace-script";
import { WritingWorkspace } from "@/components/writing-workspace";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import { shouldAutoStartWalkthrough } from "@/lib/walkthrough";

export default async function TasksPage() {
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
    await redirectForUnauthenticatedOrBlockedUser("/tasks");
    return null;
  }

  if (!user.isAdmin && !(await hasRedeemedAccessCode(user.id))) {
    redirect("/activate");
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <WalkthroughWorkspaceScriptProvider>
        <TasksWalkthroughRunner shouldAutoStart={shouldAutoStartWalkthrough(user.walkthroughCompletedVersion)} />
        <WritingWorkspace />
      </WalkthroughWorkspaceScriptProvider>
    </main>
  );
}
