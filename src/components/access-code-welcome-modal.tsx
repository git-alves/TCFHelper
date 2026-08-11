"use client";

import { useEffect, useRef, type CSSProperties } from "react";

interface AccessCodeWelcomeModalProps {
  onContinue: () => void;
}

const CONFETTI_PIECES = [
  { left: "8%", color: "#a78bfa", delay: "0s" },
  { left: "22%", color: "#34d399", delay: "0.12s" },
  { left: "38%", color: "#f472b6", delay: "0.05s" },
  { left: "52%", color: "#60a5fa", delay: "0.2s" },
  { left: "66%", color: "#fbbf24", delay: "0.1s" },
  { left: "80%", color: "#a78bfa", delay: "0.18s" },
  { left: "92%", color: "#34d399", delay: "0.08s" },
];

// Celebrates a learner's first access-code admission. A durable user-level
// marker is set atomically with redemption, so the modal remains one-time if
// an owner later deactivates access and the learner redeems a new code.
export function AccessCodeWelcomeModal({ onContinue }: AccessCodeWelcomeModalProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    continueRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onContinue();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onContinue]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="access-code-welcome-title"
        aria-describedby="access-code-welcome-subtitle"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-black/[.1] bg-background p-6 pt-10 text-center shadow-xl dark:border-white/[.15]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-14 justify-center gap-3 overflow-hidden">
          {CONFETTI_PIECES.map((piece, index) => (
            <span
              key={index}
              className="confetti-piece absolute top-0 h-2.5 w-2.5 rounded-sm"
              style={
                {
                  left: piece.left,
                  backgroundColor: piece.color,
                  "--confetti-delay": piece.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onContinue}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-black/[.05] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.08]"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-7 w-7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 12.5l3.2 3.2L17 8.5" />
          </svg>
        </div>

        <h2 id="access-code-welcome-title" className="mt-4 text-xl font-semibold tracking-tight">
          Access Successfully Granted! 🎉
        </h2>
        <p id="access-code-welcome-subtitle" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Your account now has full access to simulations and other resources.
        </p>

        <button
          ref={continueRef}
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Start writing
        </button>
      </div>
    </div>
  );
}
