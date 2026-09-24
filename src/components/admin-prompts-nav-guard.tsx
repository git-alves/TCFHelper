"use client";

import Link, { type LinkProps } from "next/link";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface AdminPromptsNavGuardContextValue {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
}

const AdminPromptsNavGuardContext = createContext<AdminPromptsNavGuardContextValue | null>(null);

// Scoped to just the /admin/prompts page -- AdminPromptsForm reports its
// dirty state here, and AdminPromptsNavLink (the page's own "Admin
// sections" links) reads it to confirm before navigating away. Deliberately
// separate from the app-wide DashboardNavGuardProvider (writing-workspace's
// guard against leaving /tasks): that one coordinates through the shared
// nav bar, which this page's in-page section links never go through.
export function AdminPromptsNavGuardProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const value = useMemo(() => ({ hasUnsavedChanges, setHasUnsavedChanges }), [hasUnsavedChanges]);

  return <AdminPromptsNavGuardContext.Provider value={value}>{children}</AdminPromptsNavGuardContext.Provider>;
}

export function useAdminPromptsNavGuard(): AdminPromptsNavGuardContextValue {
  const ctx = useContext(AdminPromptsNavGuardContext);
  if (!ctx) {
    throw new Error("useAdminPromptsNavGuard must be used within an AdminPromptsNavGuardProvider");
  }
  return ctx;
}

/** A drop-in Link for this page's own nav that confirms before discarding an unsaved prompt edit. */
export function AdminPromptsNavLink(props: LinkProps & { className?: string; children: ReactNode }) {
  const { hasUnsavedChanges } = useAdminPromptsNavGuard();

  return (
    <Link
      {...props}
      onClick={(event) => {
        if (
          hasUnsavedChanges &&
          !window.confirm("You have unsaved prompt changes that will be lost if you leave this page. Continue?")
        ) {
          event.preventDefault();
        }
      }}
    />
  );
}
