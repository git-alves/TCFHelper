import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CorrectionHistoryDialog } from "@/components/correction-history-dialog";
import { DashboardAccountUnavailable } from "@/components/dashboard-account-unavailable";
import { hasRedeemedAccessCode } from "@/lib/access-code";
import { getAppCopy } from "@/lib/app-copy";
import { AppUserProvisioningError, getCurrentAppUser } from "@/lib/app-user";
import { redirectForUnauthenticatedOrBlockedUser } from "@/lib/blocked-user-redirect";
import { getCorrectionForUser } from "@/lib/correction-history";
import { APP_LOCALE_INTL_TAGS } from "@/lib/app-locale";
import { getRequestLocale } from "@/lib/request-locale";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";

interface CorrectionHistoryDetailPageProps {
  params: Promise<{ essayId: string }>;
}

export default async function CorrectionHistoryDetailPage({ params }: CorrectionHistoryDetailPageProps) {
  const { essayId } = await params;
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
    await redirectForUnauthenticatedOrBlockedUser(`/dashboard/history/${essayId}`);
    return null;
  }

  if (!(await hasRedeemedAccessCode(user.id))) {
    redirect("/activate");
  }

  const [detail, locale] = await Promise.all([getCorrectionForUser(user.id, essayId), getRequestLocale()]);
  if (!detail) notFound();

  if (detail.kind === "complete") {
    return <CorrectionHistoryDialog detail={detail} />;
  }

  const copy = getAppCopy(locale);
  const task = TASK_INSTRUCTIONS[detail.taskType];
  const assessedDate = new Intl.DateTimeFormat(APP_LOCALE_INTL_TAGS[locale], { dateStyle: "medium" }).format(
    new Date(detail.assessedAt),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link
        href="/dashboard/history"
        className="self-start text-sm font-medium text-violet-700 underline underline-offset-4 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
      >
        {copy.dashboard.backToCorrectionHistory}
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.workspace.correctionModal.title({ taskLabel: task.label })}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{copy.dashboard.attemptedOn({ date: assessedDate })}</p>
      </header>

      <p role="status" className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-300">
        {copy.dashboard.limitedCorrectionDetails}
      </p>

      <section className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.12] sm:p-5">
        <h2 className="font-semibold">{copy.workspace.correctionModal.originalHeading}</h2>
        <p lang="fr" className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">
          {detail.originalText}
        </p>
      </section>

      <section className="rounded-2xl border border-black/[.08] p-4 dark:border-white/[.12] sm:p-5">
        <h2 className="font-semibold">{copy.workspace.correctionModal.commentsHeading}</h2>
        {detail.cefrLevel && (
          <p className="mt-3 text-sm font-medium text-violet-700 dark:text-violet-300">
            {copy.workspace.correctionModal.estimatedLevel({ level: detail.cefrLevel })}
          </p>
        )}
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-700 dark:text-zinc-200">{detail.summary}</p>
      </section>
    </main>
  );
}
