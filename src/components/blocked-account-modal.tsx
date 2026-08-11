"use client";

import { useClerk } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SUPPORT_EMAIL = "support@mytcflab.com";

/**
 * The recovery surface for a verified blocked session. It stays mounted until
 * the person explicitly leaves, so they can understand what happened and use
 * the support action before their Clerk session is cleared.
 */
export function BlockedAccountModal() {
  const { signOut } = useClerk();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const returnToSignIn = useCallback(async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);
    setSignOutError("");
    try {
      // Navigating without clearing the active blocked Clerk session would
      // send /login straight back to this modal. Clerk owns the redirect only
      // after the session has actually been ended.
      await signOut({ redirectUrl: "/login" });
    } catch {
      setIsSigningOut(false);
      setSignOutError("We could not sign you out. Please try again.");
    }
  }, [isSigningOut, signOut]);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        void returnToSignIn();
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

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [returnToSignIn]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="blocked-account-title"
        aria-describedby="blocked-account-description"
        aria-busy={isSigningOut || undefined}
        className="relative w-full max-w-sm rounded-2xl border border-black/[.1] bg-background p-6 text-center shadow-xl dark:border-white/[.15]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={() => void returnToSignIn()}
          disabled={isSigningOut}
          aria-label="Close and return to sign in"
          className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-black/[.05] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/[.08]"
        >
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-7 w-7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M5.2 19h13.6c1.25 0 2.04-1.35 1.42-2.44l-6.8-12a1.64 1.64 0 0 0-2.84 0l-6.8 12C3.16 17.65 3.95 19 5.2 19Z" />
          </svg>
        </div>

        <h1 id="blocked-account-title" className="mt-4 text-xl font-semibold tracking-tight">
          We were unable to access your account
        </h1>
        <p id="blocked-account-description" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Please contact support!
        </p>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-6 block w-full rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Contact Support
        </a>

        <p className="sr-only" role="status" aria-live="polite">
          {isSigningOut ? "Returning to sign in" : signOutError}
        </p>
        {signOutError && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{signOutError}</p>}
      </div>
    </div>
  );
}
