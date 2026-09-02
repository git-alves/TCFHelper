"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAppCopy } from "@/components/app-locale-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { AppCopy } from "@/lib/app-copy";
import type { PracticeProgressSummary } from "@/lib/practice-progress";

interface PracticeProgressCardContentProps {
  summary: PracticeProgressSummary;
  copy: AppCopy;
}

/**
 * Client-only wrapper so server pages pass only the serializable summary
 * across the RSC boundary. AppCopy contains functions, so passing it from a
 * Server Component would fail at runtime (see CorrectionHistoryList).
 */
export function PracticeProgressCard({ summary }: { summary: PracticeProgressSummary }) {
  const copy = useAppCopy();
  return <PracticeProgressCardContent summary={summary} copy={copy} />;
}

// Exported for static component tests. Server pages must render the wrapper
// above so copy functions are obtained on the client rather than serialized.
export function PracticeProgressCardContent({ summary, copy }: PracticeProgressCardContentProps) {
  const dashboardCopy = copy.dashboard;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isCleared, setIsCleared] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsMenuOpen(false);
      menuTriggerRef.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  async function handleConfirmClear() {
    setIsConfirmOpen(false);
    setIsClearing(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/practice/sessions", { method: "DELETE" });
      if (!res.ok) throw new Error("Clear failed");
      setIsCleared(true);
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setIsClearing(false);
    }
  }

  if (isCleared || summary.completedExercises === 0) {
    return status === "success" ? (
      <p role="status" aria-live="polite" className="sr-only">
        {dashboardCopy.clearPracticeProgressSuccess}
      </p>
    ) : null;
  }

  return (
    <section
      aria-labelledby="practice-activity-heading"
      className="relative rounded-2xl border border-violet-200 bg-violet-50/70 p-5 dark:border-violet-400/30 dark:bg-violet-950/20 sm:p-6"
    >
      <div ref={menuContainerRef} className="absolute right-3 top-3">
        <button
          ref={menuTriggerRef}
          type="button"
          onClick={() => setIsMenuOpen((current) => !current)}
          disabled={isClearing}
          aria-expanded={isMenuOpen}
          aria-label={dashboardCopy.practiceActionsMenu}
          className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-white/[.06]"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
            <circle cx="10" cy="4" r="1.5" />
            <circle cx="10" cy="10" r="1.5" />
            <circle cx="10" cy="16" r="1.5" />
          </svg>
        </button>
        <div
          hidden={!isMenuOpen}
          className="absolute right-0 top-full z-10 mt-2 w-56 overflow-hidden rounded-xl border border-black/[.1] bg-background py-1 shadow-lg dark:border-white/[.15]"
        >
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsConfirmOpen(true);
            }}
            className="block w-full px-4 py-2 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-400/10"
          >
            {dashboardCopy.clearPracticeProgressAction}
          </button>
        </div>
      </div>

      <h2 id="practice-activity-heading" className="text-sm font-semibold text-violet-950 dark:text-violet-100">
        {dashboardCopy.practiceActivityTitle}
      </h2>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {dashboardCopy.practiceExercisesCompleted({ count: summary.completedExercises })}
      </p>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
        {dashboardCopy.practiceCompletionBreakdown({
          independent: summary.completedIndependently,
          helped: summary.completedWithHelp,
        })}
      </p>
      {summary.completedTaskParts > 0 && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {dashboardCopy.practiceTaskPartsCompleted({ count: summary.completedTaskParts })}
        </p>
      )}
      <Link
        href="/practice"
        className="mt-4 inline-flex rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        {dashboardCopy.continuePractice}
      </Link>

      {status === "error" && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
          {dashboardCopy.clearPracticeProgressError}
        </p>
      )}

      <ConfirmDialog
        open={isConfirmOpen}
        title={dashboardCopy.clearPracticeProgressConfirmTitle}
        description={dashboardCopy.clearPracticeProgressConfirmDescription}
        confirmLabel={dashboardCopy.clearPracticeProgressConfirm}
        cancelLabel={copy.common.cancel}
        isConfirming={isClearing}
        onConfirm={() => void handleConfirmClear()}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </section>
  );
}
