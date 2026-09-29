import Link from "next/link";
import { redirect } from "next/navigation";
import { CorrectionHistoryList } from "@/components/correction-history-list";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { getAppCopy } from "@/lib/app-copy";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import { CORRECTION_HISTORY_PAGE_SIZE, getCorrectionHistoryPage } from "@/lib/correction-history";
import { getRequestLocale } from "@/lib/request-locale";

interface CorrectionHistoryPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

function firstParamValue(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

function parsePage(value: string | string[] | undefined): number {
  const rawPage = Number(firstParamValue(value) || "1");
  return Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
}

function pageHref(page: number) {
  return page === 1 ? "/dashboard/history" : `/dashboard/history?page=${page}`;
}

export default async function CorrectionHistoryPage({ searchParams }: CorrectionHistoryPageProps) {
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

  if (!user.isAdmin && !(await hasRedeemedAccessCode(user.id))) {
    redirect("/activate");
  }

  const requestedPage = parsePage((await searchParams).page);
  const [historyPage, locale] = await Promise.all([
    getCorrectionHistoryPage(user.id, requestedPage),
    getRequestLocale(),
  ]);
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
      <CorrectionHistoryList items={historyPage.items} />
      {historyPage.pageCount > 1 && (
        <nav aria-label={copy.dashboard.correctionHistoryTitle} className="flex items-center justify-between gap-3">
          {historyPage.page > 1 ? (
            <Link
              href={pageHref(historyPage.page - 1)}
              className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
            >
              {copy.dashboard.paginationPrevious}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            {copy.dashboard.paginationShowingRange({
              start: (historyPage.page - 1) * CORRECTION_HISTORY_PAGE_SIZE + 1,
              end: Math.min(historyPage.page * CORRECTION_HISTORY_PAGE_SIZE, historyPage.total),
              total: historyPage.total,
            })}
            {" · "}
            {copy.dashboard.paginationPageOf({ page: historyPage.page, pageCount: historyPage.pageCount })}
          </span>
          {historyPage.page < historyPage.pageCount ? (
            <Link
              href={pageHref(historyPage.page + 1)}
              className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
            >
              {copy.dashboard.paginationNext}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
