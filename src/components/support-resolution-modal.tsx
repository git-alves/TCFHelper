"use client";

import { useEffect, useRef } from "react";
import { useAppCopy } from "@/components/app-locale-provider";
import type { SupportResolutionNotice } from "@/lib/support-resolution";

interface SupportResolutionModalProps {
  notice: SupportResolutionNotice;
  isBusy: boolean;
  hasError: boolean;
  onAnswer: (feedback: "WORKED" | "STILL_BROKEN") => void;
  /** The X (and Escape): closes the notice without an answer, for good. */
  onDismiss: () => void;
}

const FOCUSABLE_SELECTOR = "button:not([disabled])";

/**
 * Asks the learner to confirm that a resolved support ticket really works.
 * It is deliberately not the intercepted /support route: it opens in place
 * from the nav icon and never changes the URL. Clicking the backdrop does
 * nothing, because closing it (X or Escape) dismisses the notice for good and
 * must not happen by accident.
 */
export function SupportResolutionModal({ notice, isBusy, hasError, onAnswer, onDismiss }: SupportResolutionModalProps) {
  const copy = useAppCopy();
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const isBusyRef = useRef(isBusy);
  const onDismissRef = useRef(onDismiss);
  // The keydown listener below is registered once; these keep it reading the
  // latest props without re-registering (and re-focusing) on every render.
  useEffect(() => {
    isBusyRef.current = isBusy;
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!isBusyRef.current) onDismissRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!dialogRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  const { resolution } = copy.support;
  const titleId = `support-resolution-title-${notice.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl border border-black/[.1] bg-background p-5 shadow-2xl dark:border-white/[.15] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight">
            {resolution.title({ number: notice.ticketNumber })}
          </h2>
          <button
            type="button"
            onClick={onDismiss}
            disabled={isBusy}
            aria-label={resolution.close}
            className="-mr-1.5 -mt-1 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-black/[.05] hover:text-foreground disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/[.08]"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {resolution.body({ number: notice.ticketNumber })}
        </p>
        {notice.resolutionNote && (
          <div className="mt-4 rounded-xl bg-black/[.03] px-4 py-3 dark:bg-white/[.05]">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
              {resolution.noteLabel}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
              {notice.resolutionNote}
            </p>
          </div>
        )}
        {hasError && (
          <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-300">
            {resolution.error}
          </p>
        )}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            ref={firstButtonRef}
            type="button"
            onClick={() => onAnswer("WORKED")}
            disabled={isBusy}
            className="flex-1 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
          >
            {resolution.worked}
          </button>
          <button
            type="button"
            onClick={() => onAnswer("STILL_BROKEN")}
            disabled={isBusy}
            className="flex-1 rounded-xl border border-black/[.15] px-4 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.08]"
          >
            {resolution.stillBroken}
          </button>
        </div>
      </div>
    </div>
  );
}
