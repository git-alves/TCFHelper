"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type DashboardNavGuard = () => void;

interface DashboardNavGuardContextValue {
  register: (guard: DashboardNavGuard | null) => void;
  /** Returns true when a guard handled the click (so the caller must not
   * navigate itself); false when there was nothing to guard. */
  requestNavigation: () => boolean;
  /** True while the workspace has a correction in flight: the nav bar
   * disables its Dashboard control rather than letting a learner navigate
   * away from an already-submitted, unabortable request. */
  isNavigationBusy: boolean;
  setNavigationBusy: (busy: boolean) => void;
  /** True exactly while the workspace is mounted -- i.e. a guard is
   * registered. The nav bar uses this, not the URL, to decide which control
   * to show: opening Settings from /tasks intercepts the route and updates
   * the URL to /settings while /tasks (and the workspace under it) stays
   * mounted behind the modal, so usePathname() alone would misreport it. */
  isWorkspaceMounted: boolean;
}

const DashboardNavGuardContext = createContext<DashboardNavGuardContextValue | null>(null);

// Lets the nav bar's Dashboard control and the writing workspace it links to
// coordinate without a direct parent/child relationship: the workspace is
// only mounted on /tasks, but the nav bar renders on every page. The
// workspace registers a guard (and a busy flag) while mounted; the nav bar
// defers to it whenever one is present, so leaving /tasks with unsaved work
// confirms before navigating, and can't be triggered while a correction the
// server will persist regardless is still in flight.
export function DashboardNavGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<DashboardNavGuard | null>(null);
  const [isNavigationBusy, setNavigationBusy] = useState(false);
  const [isWorkspaceMounted, setIsWorkspaceMounted] = useState(false);

  const register = useCallback((guard: DashboardNavGuard | null) => {
    guardRef.current = guard;
    setIsWorkspaceMounted(guard !== null);
  }, []);

  const requestNavigation = useCallback(() => {
    if (!guardRef.current) return false;
    guardRef.current();
    return true;
  }, []);

  const value = useMemo(
    () => ({ register, requestNavigation, isNavigationBusy, setNavigationBusy, isWorkspaceMounted }),
    [register, requestNavigation, isNavigationBusy, isWorkspaceMounted],
  );

  return <DashboardNavGuardContext.Provider value={value}>{children}</DashboardNavGuardContext.Provider>;
}

export function useDashboardNavGuard(): DashboardNavGuardContextValue {
  const ctx = useContext(DashboardNavGuardContext);
  if (!ctx) {
    throw new Error("useDashboardNavGuard must be used within a DashboardNavGuardProvider");
  }
  return ctx;
}
