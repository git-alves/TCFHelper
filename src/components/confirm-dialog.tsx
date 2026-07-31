"use client";

import { useEffect, useRef } from "react";
import { useAppCopy } from "@/components/app-locale-provider";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// A lightweight replacement for window.confirm(): it preserves the blocking
// decision point while keeping focus inside the modal, restoring it on close,
// and making Escape a safe cancellation path.
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const copy = useAppCopy();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
        return;
      }

      if (e.key !== "Tab") return;

      const first = cancelRef.current;
      const last = confirmRef.current;
      if (!first || !last) return;

      const activeElement = document.activeElement;
      if (!dialogRef.current?.contains(activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl border border-black/[.1] bg-background p-5 shadow-lg dark:border-white/[.15]"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-black/[.15] px-4 py-1.5 text-sm transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
          >
            {cancelLabel ?? copy.common.cancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
