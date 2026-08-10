import Link from "next/link";
import { redirect } from "next/navigation";
import { CorrectionHistoryList } from "@/components/correction-history-list";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { getAppCopy } from "@/lib/app-copy";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import { getCorrectionHistory } from "@/lib/correction-history";
import { getRequestLocale } from "@/lib/request-locale";

export default async function CorrectionHistoryPage() {
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
    await redirectForUnauthenticatedOrBlockedUser("/dashboard/history");
    return null;
  }

  if (!(await hasRedeemedAccessCode(user.id))) {
    redirect("/activate");
  }

  const [items, locale] = await Promise.all([getCorrectionHistory(user.id), getRequestLocale()]);
  const copy = getAppCopy(locale);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link
        href="/dashboard"
        className="self-start text-sm font-medium text-violet-700 underline underline-offset-4 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
      >
        {copy.dashboard.backToDashboard}
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.dashboard.correctionHistoryTitle}</h1>
      </div>
      <CorrectionHistoryList items={items} />
    </main>
  );
}
