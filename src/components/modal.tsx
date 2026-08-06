"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  closeLabel: string;
  ariaLabel: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Backs the intercepted-route modal pattern (see app/@settings): closing
// always goes through router.back() so the URL and browser history stay in
// sync with what's actually on screen, per Next's parallel + intercepting
// routes convention for modals.
export function Modal({ children, closeLabel, ariaLabel }: ModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Move focus into the dialog on open, and give it back to whatever
    // triggered the modal (the nav icon) on close — a background page must
    // never retain keyboard focus behind an open, or just-closed, modal.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const initialFocusable = dialogRef.current
      ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      : [];
    // Focus the first real control, not the dialog container itself: the
    // container is only a Tab boundary, so starting there makes Shift+Tab's
    // very first press match neither boundary and escape to the page behind.
    (initialFocusable[0] ?? dialogRef.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.back();
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

      if (event.shiftKey && active === first) {
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
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 bg-black/20" onClick={() => router.back()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="absolute right-4 top-[4.25rem] max-h-[calc(100vh-5.5rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-black/[.08] bg-background p-5 shadow-xl outline-none dark:border-white/[.145] sm:right-6 lg:right-8"
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={closeLabel}
            className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-black/[.05] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.08]"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
