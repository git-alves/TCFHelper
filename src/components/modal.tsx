"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  closeLabel: string;
}

// Backs the intercepted-route modal pattern (see app/@settings): closing
// always goes through router.back() so the URL and browser history stay in
// sync with what's actually on screen, per Next's parallel + intercepting
// routes convention for modals.
export function Modal({ children, closeLabel }: ModalProps) {
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.back();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 sm:items-center"
      onClick={() => router.back()}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl border border-black/[.08] bg-background p-6 shadow-xl dark:border-white/[.145] sm:p-8"
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
