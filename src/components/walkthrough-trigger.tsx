"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type WalkthroughTrigger = () => void;

interface WalkthroughTriggerContextValue {
  register: (trigger: WalkthroughTrigger | null) => void;
  requestStart: () => void;
  /** True exactly while a page-specific runner (DashboardWalkthroughRunner
   * or TasksWalkthroughRunner) is mounted and has registered a trigger. The
   * nav bar uses this to decide whether to show "Take a tour" at all --
   * there's nothing to start on pages like /settings or /dashboard/history. */
  isAvailable: boolean;
}

const WalkthroughTriggerContext = createContext<WalkthroughTriggerContextValue | null>(null);

// Lets the nav bar's "Take a tour" control and whichever page-specific
// walkthrough runner is actually mounted coordinate without a direct
// parent/child relationship -- the nav bar renders on every page, but a
// runner (and thus a tour to start) only exists on /dashboard and /tasks.
// Mirrors DashboardNavGuardProvider's registration pattern for the same
// kind of cross-component coordination.
export function WalkthroughTriggerProvider({ children }: { children: ReactNode }) {
  const triggerRef = useRef<WalkthroughTrigger | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const register = useCallback((trigger: WalkthroughTrigger | null) => {
    triggerRef.current = trigger;
    setIsAvailable(trigger !== null);
  }, []);

  const requestStart = useCallback(() => {
    triggerRef.current?.();
  }, []);

  const value = useMemo(() => ({ register, requestStart, isAvailable }), [register, requestStart, isAvailable]);

  return <WalkthroughTriggerContext.Provider value={value}>{children}</WalkthroughTriggerContext.Provider>;
}

export function useWalkthroughTrigger(): WalkthroughTriggerContextValue {
  const ctx = useContext(WalkthroughTriggerContext);
  if (!ctx) {
    throw new Error("useWalkthroughTrigger must be used within a WalkthroughTriggerProvider");
  }
  return ctx;
}
