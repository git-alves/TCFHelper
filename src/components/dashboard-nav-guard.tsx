"use client";

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type DashboardNavGuard = () => void;

interface DashboardNavGuardContextValue {
  register: (guard: DashboardNavGuard | null) => void;
  /** Returns true when a guard handled the click (so the caller must not
   * navigate itself); false when there was nothing to guard. */
  requestNavigation: () => boolean;
}

const DashboardNavGuardContext = createContext<DashboardNavGuardContextValue | null>(null);

// Lets the nav bar's Dashboard link and the writing workspace it links to
// coordinate without a direct parent/child relationship: the workspace is
// only mounted on /dashboard itself, but the nav bar renders on every page.
// The workspace registers a guard while mounted; the nav bar defers to it
// (instead of navigating) whenever one is present, so clicking Dashboard
// while already there with unsaved work confirms before resetting rather
// than silently discarding it.
export function DashboardNavGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<DashboardNavGuard | null>(null);

  const register = useCallback((guard: DashboardNavGuard | null) => {
    guardRef.current = guard;
  }, []);

  const requestNavigation = useCallback(() => {
    if (!guardRef.current) return false;
    guardRef.current();
    return true;
  }, []);

  const value = useMemo(() => ({ register, requestNavigation }), [register, requestNavigation]);

  return <DashboardNavGuardContext.Provider value={value}>{children}</DashboardNavGuardContext.Provider>;
}

export function useDashboardNavGuard(): DashboardNavGuardContextValue {
  const ctx = useContext(DashboardNavGuardContext);
  if (!ctx) {
    throw new Error("useDashboardNavGuard must be used within a DashboardNavGuardProvider");
  }
  return ctx;
}
