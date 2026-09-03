"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  children: ReactNode;
  closeLabel: string;
  ariaLabel: string;
  title?: string;
  panelClassName?: string;
  // CSS selector (evaluated within the dialog) for where initial focus
  // should land. Falls back to the first focusable element when omitted or
  // not found -- most modals don't need to opt out of that default.
  initialFocusSelector?: string;
}

type CloseGuard = () => boolean;

interface ModalCloseControl {
  // Registers a predicate that can veto an Escape/backdrop/close-button
  // attempt by returning false. A guard is free to trigger its own UI (e.g.
  // a discard-draft confirmation) as a side effect of vetoing, then call
  // closeImmediately() once the user actually confirms.
  registerCloseGuard: (guard: CloseGuard | null) => void;
  closeImmediately: () => void;
}

const ModalCloseContext = createContext<ModalCloseControl | null>(null);

// Lets a descendant of Modal veto an in-progress close -- e.g. to block
// closing outright while a submission is in flight, or to intercept the
// attempt and show its own confirmation before allowing it. Re-registers
// automatically whenever `guard`'s identity changes, so it always sees
// current component state without the caller needing useCallback.
export function useModalCloseGuard(guard: CloseGuard | null) {
  const control = useContext(ModalCloseContext);
  useEffect(() => {
    control?.registerCloseGuard(guard);
    return () => control?.registerCloseGuard(null);
  }, [control, guard]);
}

const NOOP_CLOSE = () => {};

// For a guard's own confirmation UI to finish closing the modal once the
// user has explicitly confirmed, bypassing the guard that vetoed it. Safe to
// call from a component that sometimes renders outside any Modal (e.g. a
// form shared between a modal and its full-page equivalent): closeImmediately
// is a no-op with no ancestor Modal, since there's then nothing to close.
export function useModalCloseControl(): Pick<ModalCloseControl, "closeImmediately"> {
  const control = useContext(ModalCloseContext);
  return control ?? { closeImmediately: NOOP_CLOSE };
}

const DEFAULT_PANEL_CLASSNAME =
  "absolute right-4 top-[4.25rem] max-h-[calc(100vh-5.5rem)] w-[calc(100vw-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-black/[.08] bg-background p-5 shadow-xl outline-none dark:border-white/[.145] sm:right-6 lg:right-8";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Backs the intercepted-route modal pattern (see app/@settings): closing
// always goes through router.back() so the URL and browser history stay in
// sync with what's actually on screen, per Next's parallel + intercepting
// routes convention for modals.
export function Modal({ children, closeLabel, ariaLabel, title, panelClassName, initialFocusSelector }: ModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeGuardRef = useRef<CloseGuard | null>(null);

  const registerCloseGuard = useCallback((guard: CloseGuard | null) => {
    closeGuardRef.current = guard;
  }, []);
  const closeImmediately = useCallback(() => router.back(), [router]);

  function requestClose() {
    if (closeGuardRef.current && !closeGuardRef.current()) return;
    closeImmediately();
  }

  useEffect(() => {
    // Move focus into the dialog on open, and give it back to whatever
    // triggered the modal (the nav icon) on close — a background page must
    // never retain keyboard focus behind an open, or just-closed, modal.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const initialFocusable = dialogRef.current
      ? Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      : [];
    const requestedFocus = initialFocusSelector
      ? (dialogRef.current?.querySelector<HTMLElement>(initialFocusSelector) ?? null)
      : null;
    // Focus the first real control, not the dialog container itself: the
    // container is only a Tab boundary, so starting there makes Shift+Tab's
    // very first press match neither boundary and escape to the page behind.
    (requestedFocus ?? initialFocusable[0] ?? dialogRef.current)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      // A nested alertdialog (e.g. a discard-draft confirmation) owns
      // Escape/Tab while it's open; defer to it instead of this outer trap
      // competing over the same keydown.
      if ((document.activeElement as HTMLElement | null)?.closest('[role="alertdialog"]')) return;

      if (event.key === "Escape") {
        requestClose();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, initialFocusSelector]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4" onClick={requestClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={panelClassName ?? DEFAULT_PANEL_CLASSNAME}
      >
        <div className={title ? "flex items-center justify-between border-b border-black/[.08] px-5 py-4 dark:border-white/[.145] sm:px-6" : "flex justify-end"}>
          {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
          <button
            type="button"
            onClick={requestClose}
            aria-label={closeLabel}
            className="rounded-full p-1.5 text-zinc-500 transition-colors hover:bg-black/[.05] hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/[.08]"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <ModalCloseContext.Provider value={{ registerCloseGuard, closeImmediately }}>
          {children}
        </ModalCloseContext.Provider>
      </div>
    </div>
  );
}
