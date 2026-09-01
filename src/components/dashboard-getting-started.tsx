import Link from "next/link";
import type { AppCopy } from "@/lib/app-copy";

interface DashboardGettingStartedProps {
  copy: AppCopy["dashboard"];
}

/**
 * The dashboard is initially empty. Give a new learner their first useful
 * decision here instead of making progress visualisations pretend to be the
 * starting activity. Both routes remain equally available; Practice is
 * marked as the recommended scaffolded route without blocking a learner who
 * is ready for a full response.
 */
export function DashboardGettingStarted({ copy }: DashboardGettingStartedProps) {
  return (
    <section
      aria-labelledby="getting-started-heading"
      data-walkthrough="dashboard-start"
      className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-400/30 dark:bg-violet-950/20 sm:p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
        {copy.startHereEyebrow}
      </p>
      <h2 id="getting-started-heading" className="mt-2 text-xl font-semibold tracking-tight">
        {copy.startHereTitle}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-700 dark:text-zinc-300">{copy.startHereDescription}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-violet-300 bg-background p-4 shadow-sm dark:border-violet-300/40">
          <p className="text-sm font-semibold">{copy.practiceStartTitle}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{copy.practiceStartDescription}</p>
          <Link
            href="/practice"
            className="mt-4 inline-flex rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            {copy.practiceStartAction}
          </Link>
        </article>
        <article className="rounded-xl border border-black/[.12] bg-background p-4 dark:border-white/[.18]">
          <p className="text-sm font-semibold">{copy.tasksStartTitle}</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{copy.tasksStartDescription}</p>
          <Link
            href="/tasks"
            className="mt-4 inline-flex rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
          >
            {copy.tasksStartAction}
          </Link>
        </article>
      </div>
    </section>
  );
}
