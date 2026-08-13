"use client";

import { useEffect, useRef, useState, type Ref } from "react";
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

export function CorrectionHistoryEmpty({
  copy,
  focusRef,
}: Pick<CorrectionHistoryListContentProps, "copy"> & { focusRef?: Ref<HTMLDivElement> }) {
  return (
    <div ref={focusRef} tabIndex={-1} className="rounded-2xl border border-black/[.08] p-8 text-center outline-none dark:border-white/[.145]">
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "success" | "error">("idle");
  const menuContainerRefs = useRef(new Map<string, HTMLDivElement | null>());
  const menuTriggerRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const emptyStateRef = useRef<HTMLDivElement>(null);
  // Set right before removing the deleted item from visibleItems, and
  // consumed by the effect below once that removal has actually rendered --
  // the deleted item's own trigger button no longer exists by then, so
  // focus must move on its own rather than simply being restored. null means
  // the deleted item was the only one left, so the empty state (rendered in
  // its place) gets focus instead of a next/previous item's trigger.
  const pendingFocusIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!openMenuId) return;

    function handlePointerDown(event: MouseEvent) {
      const container = menuContainerRefs.current.get(openMenuId as string);
      if (container && !container.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const id = openMenuId as string;
      setOpenMenuId(null);
      menuTriggerRefs.current.get(id)?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (pendingFocusIdRef.current === undefined) return;
    const nextId = pendingFocusIdRef.current;
    pendingFocusIdRef.current = undefined;
    if (nextId) menuTriggerRefs.current.get(nextId)?.focus();
    else emptyStateRef.current?.focus();
  }, [visibleItems]);

  async function handleConfirmDelete() {
    const id = pendingDeleteId;
    if (!id) return;

    setPendingDeleteId(null);
    setDeletingId(id);
    setDeleteStatus("idle");
    try {
      const res = await fetch(`/api/essays/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setVisibleItems((prev) => {
        const index = prev.findIndex((item) => item.id === id);
        const next = prev.filter((item) => item.id !== id);
        const nextFocusItem = next[index] ?? next[index - 1];
        pendingFocusIdRef.current = nextFocusItem ? nextFocusItem.id : null;
        return next;
      });
      setDeleteStatus("success");
    } catch {
      setDeleteStatus("error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* A single, persistent live region with a fixed role (rather than one
          mounted, or re-roled, only when there's something to say) so
          assistive tech reliably announces the text change -- some screen
          readers miss an announcement from a region whose role or presence
          changes at the same moment its content does. Deliberately kept
          outside the empty/non-empty branch below: deleting the last item
          swaps that whole branch out on the very render meant to announce
          the success, and a region inside it would be unmounted, not
          updated, at exactly that moment. */}
      <p
        role="status"
        aria-live="polite"
        className={`text-sm ${deleteStatus === "error" ? "text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        {deleteStatus === "error"
          ? copy.dashboard.deleteCorrectionError
          : deleteStatus === "success"
            ? copy.dashboard.deleteCorrectionSuccess
            : ""}
      </p>
      {visibleItems.length === 0 ? (
        <CorrectionHistoryEmpty copy={copy} focusRef={emptyStateRef} />
      ) : (
        <>
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
                            {copy.workspace.correctionModal.secureLevel({ level: item.cefrLevel })}
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
                    <div
                      ref={(element) => {
                        if (element) menuContainerRefs.current.set(item.id, element);
                        else menuContainerRefs.current.delete(item.id);
                      }}
                      className="relative shrink-0 self-start sm:self-auto"
                    >
                      <button
                        ref={(element) => {
                          if (element) menuTriggerRefs.current.set(item.id, element);
                          else menuTriggerRefs.current.delete(item.id);
                        }}
                        type="button"
                        onClick={() => setOpenMenuId((current) => (current === item.id ? null : item.id))}
                        disabled={deletingId === item.id}
                        aria-expanded={openMenuId === item.id}
                        aria-label={copy.dashboard.correctionActionsMenu}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-white/[.06]"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                          <circle cx="10" cy="4" r="1.5" />
                          <circle cx="10" cy="10" r="1.5" />
                          <circle cx="10" cy="16" r="1.5" />
                        </svg>
                      </button>
                      {/* A plain disclosure popover, not role="menu"/"menuitem": with
                          only two ordinary actions (a real link and a button), the
                          APG menu-button pattern's roving-tabindex and arrow/Home/End
                          navigation would be complexity without benefit here. Normal
                          Tab order plus the existing Escape/click-outside handling
                          already covers keyboard use correctly for a disclosure. */}
                      <div
                        hidden={openMenuId !== item.id}
                        className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-xl border border-black/[.1] bg-background py-1 shadow-lg dark:border-white/[.15]"
                      >
                        <Link
                          href={`/dashboard/history/${encodeURIComponent(item.id)}`}
                          onClick={() => setOpenMenuId(null)}
                          className="block px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                        >
                          {copy.workspace.correctionModal.viewCorrection}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setPendingDeleteId(item.id);
                          }}
                          className="block w-full px-4 py-2 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-400/10"
                        >
                          {copy.dashboard.deleteCorrectionAction}
                        </button>
                      </div>
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
      )}
    </>
  );
}
