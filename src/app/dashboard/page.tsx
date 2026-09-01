import Link from "next/link";
import { CorrectionHistoryList } from "@/components/correction-history-list";
import { redirect } from "next/navigation";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { DashboardHeading } from "@/components/dashboard-heading";
import { DashboardGettingStarted } from "@/components/dashboard-getting-started";
import { DashboardWalkthroughRunner } from "@/components/dashboard-walkthrough-runner";
import { ProgressChart } from "@/components/progress-chart";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { getAppCopy } from "@/lib/app-copy";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import { getRecentCorrections } from "@/lib/correction-history";
import { getEssayProgressPoints } from "@/lib/essay-progress";
import { getRequestLocale } from "@/lib/request-locale";
import { shouldAutoStartWalkthrough } from "@/lib/walkthrough";

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
    await redirectForUnauthenticatedOrBlockedUser("/dashboard");
    return null;
  }

  if (!user.isAdmin && !(await hasRedeemedAccessCode(user.id))) {
    redirect("/activate");
  }

  const [points, recentCorrections, locale] = await Promise.all([
    getEssayProgressPoints(user.id),
    getRecentCorrections(user.id),
    getRequestLocale(),
  ]);
  const copy = getAppCopy(locale);
  const hasGettingStarted = points.length === 0 && recentCorrections.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <DashboardWalkthroughRunner
        shouldAutoStart={shouldAutoStartWalkthrough(user.walkthroughCompletedVersion)}
        hasGettingStarted={hasGettingStarted}
      />

      <DashboardHeading name={user.name ?? user.email} />

      {hasGettingStarted && <DashboardGettingStarted copy={copy.dashboard} />}

      <section aria-labelledby="progress-chart-heading" data-walkthrough="dashboard-welcome" className="flex flex-col gap-3">
        <h2 id="progress-chart-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {copy.dashboard.chartTitle}
        </h2>
        <ProgressChart points={points} />
      </section>

      <section
        aria-labelledby="recent-corrections-heading"
        data-walkthrough="dashboard-corrections"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="recent-corrections-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {copy.dashboard.recentCorrectionsTitle}
          </h2>
          {recentCorrections.length > 0 && (
            <Link
              href="/dashboard/history"
              className="text-sm font-medium text-violet-700 underline underline-offset-4 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
            >
              {copy.dashboard.viewAllCorrections}
            </Link>
          )}
        </div>
        <CorrectionHistoryList items={recentCorrections} />
      </section>
    </main>
  );
}
