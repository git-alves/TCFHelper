"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { AppCopy } from "@/lib/app-copy";
import { APP_LOCALE_INTL_TAGS, type AppLocale } from "@/lib/app-locale";
import type { CorrectionHistoryItem } from "@/lib/correction-history";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";

interface CorrectionHistoryListContentProps {
  items: CorrectionHistoryItem[];
  locale: AppLocale;
  copy: AppCopy;
}

function formatAssessedDate(assessedAt: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(APP_LOCALE_INTL_TAGS[locale], { dateStyle: "medium" }).format(new Date(assessedAt));
}

export function CorrectionHistoryEmpty({ copy }: Pick<CorrectionHistoryListContentProps, "copy">) {
  return (
    <div className="rounded-2xl border border-black/[.08] p-8 text-center dark:border-white/[.145]">
      <p className="font-medium">{copy.dashboard.noCorrectionHistoryTitle}</p>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{copy.dashboard.noCorrectionHistoryDescription}</p>
    </div>
  );
}

/**
 * Client-only state and actions live behind this wrapper so server pages pass
 * only serializable history records across the RSC boundary. AppCopy contains
 * functions, so passing it from a Server Component would fail at runtime.
 */
export function CorrectionHistoryList({ items }: Pick<CorrectionHistoryListContentProps, "items">) {
  const { locale } = useAppLocale();
  const copy = useAppCopy();

  return <CorrectionHistoryListContent items={items} locale={locale} copy={copy} />;
}

// Exported for static component tests. Server pages must render the wrapper
// above so copy functions are obtained on the client rather than serialized.
export function CorrectionHistoryListContent({ items, locale, copy }: CorrectionHistoryListContentProps) {
  const [visibleItems, setVisibleItems] = useState(items);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState(false);

  if (visibleItems.length === 0) return <CorrectionHistoryEmpty copy={copy} />;

  async function handleConfirmDelete() {
    const id = pendingDeleteId;
    if (!id) return;

    setPendingDeleteId(null);
    setDeletingId(id);
    setDeleteError(false);
    try {
      const res = await fetch(`/api/essays/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setVisibleItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setDeleteError(true);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {deleteError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {copy.dashboard.deleteCorrectionError}
        </p>
      )}
      <ol className="grid gap-3">
        {visibleItems.map((item) => {
          const task = TASK_INSTRUCTIONS[item.taskType];
          const wordCountLabel = copy.workspace.correctionModal.wordCount({
            count: item.wordCount,
            minWords: task.minWords,
            maxWords: task.maxWords,
          });

          return (
            <li key={item.id}>
              <article className="flex flex-col gap-4 rounded-2xl border border-black/[.08] p-4 dark:border-white/[.12] sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className="font-semibold">{task.label}</h3>
                    <time dateTime={item.assessedAt} className="text-sm text-zinc-500 dark:text-zinc-400">
                      {copy.dashboard.attemptedOn({ date: formatAssessedDate(item.assessedAt, locale) })}
                    </time>
                  </div>
                  {item.topicTitle && <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">{item.topicTitle}</p>}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                    {item.cefrLevel && (
                      <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300">
                        {copy.workspace.correctionModal.estimatedLevel({ level: item.cefrLevel })}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 ${
                        item.meetsWordCount
                          ? "bg-emerald-500/10 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
                          : "bg-amber-500/10 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300"
                      }`}
                    >
                      {wordCountLabel}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
                  <Link
                    href={`/dashboard/history/${encodeURIComponent(item.id)}`}
                    className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                  >
                    {copy.workspace.correctionModal.viewCorrection}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(item.id)}
                    disabled={deletingId === item.id}
                    aria-label={copy.dashboard.deleteCorrectionAction}
                    className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:text-red-400 dark:hover:bg-red-400/10"
                  >
                    {copy.dashboard.deleteCorrectionAction}
                  </button>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={copy.dashboard.deleteCorrectionConfirmTitle}
        description={copy.dashboard.deleteCorrectionConfirmDescription}
        confirmLabel={copy.dashboard.deleteCorrectionConfirm}
        cancelLabel={copy.common.cancel}
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setPendingDeleteId(null)}
      />
    </>
  );
}
