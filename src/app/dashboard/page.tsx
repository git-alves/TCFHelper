import { redirect } from "next/navigation";
import Link from "next/link";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { DashboardHeading } from "@/components/dashboard-heading";
import { ProgressChart } from "@/components/progress-chart";
import { getAppCopy } from "@/lib/app-copy";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { getEssayProgressPoints } from "@/lib/essay-progress";
import { getRequestLocale } from "@/lib/request-locale";

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

  const [points, locale] = await Promise.all([getEssayProgressPoints(user.id), getRequestLocale()]);
  const copy = getAppCopy(locale);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DashboardHeading name={user.name ?? user.email} />
        <Link
          href="/tasks"
          className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          {copy.nav.tasks}
        </Link>
      </div>

      <section aria-labelledby="progress-chart-heading" className="flex flex-col gap-3">
        <h2 id="progress-chart-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {copy.dashboard.chartTitle}
        </h2>
        <ProgressChart points={points} />
      </section>
    </main>
  );
}
