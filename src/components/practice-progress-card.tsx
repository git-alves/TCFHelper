import Link from "next/link";
import type { AppCopy } from "@/lib/app-copy";
import type { PracticeProgressSummary } from "@/lib/practice-progress";

interface PracticeProgressCardProps {
  copy: AppCopy["dashboard"];
  summary: PracticeProgressSummary;
}

/**
 * A separate activity card keeps completed curated exercises distinct from
 * the CEFR chart, which only represents assessed full-task submissions.
 */
export function PracticeProgressCard({ copy, summary }: PracticeProgressCardProps) {
  if (summary.completedExercises === 0) return null;

  return (
    <section
      aria-labelledby="practice-activity-heading"
      className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-400/30 dark:bg-violet-950/20 sm:p-6"
    >
      <h2 id="practice-activity-heading" className="text-sm font-semibold text-violet-950 dark:text-violet-100">
        {copy.practiceActivityTitle}
      </h2>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {copy.practiceExercisesCompleted({ count: summary.completedExercises })}
      </p>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
        {copy.practiceCompletionBreakdown({
          independent: summary.completedIndependently,
          helped: summary.completedWithHelp,
        })}
      </p>
      {summary.completedTaskParts > 0 && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {copy.practiceTaskPartsCompleted({ count: summary.completedTaskParts })}
        </p>
      )}
      <Link
        href="/practice"
        className="mt-4 inline-flex rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        {copy.continuePractice}
      </Link>
    </section>
  );
}
