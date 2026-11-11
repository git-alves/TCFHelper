"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface AdminSupportInboxValue {
  /** New support tickets since the admin's last visit; null when unknown or not an admin. */
  count: number | null;
  /** The admin just opened the inbox: every badge goes to zero without a reload. */
  clear: () => void;
}

const AdminSupportInboxContext = createContext<AdminSupportInboxValue>({ count: null, clear: () => {} });

/**
 * Holds the new-ticket count that the root layout resolved on the server, so
 * the nav bell and the admin sidebar badge (both of which outlive any single
 * page) read one value. The layout does not re-render on a client-side
 * navigation, so without this the badges would keep their old number after the
 * admin opened /admin/support until the next full page load.
 */
export function AdminSupportInboxProvider({ initialCount, children }: { initialCount: number | null; children: ReactNode }) {
  const [state, setState] = useState({ source: initialCount, count: initialCount });
  // A fresh server value (a full page load or a router refresh) replaces
  // whatever the client has cleared since.
  if (state.source !== initialCount) setState({ source: initialCount, count: initialCount });

  const clear = useCallback(() => setState((current) => (current.count === null ? current : { ...current, count: 0 })), []);
  const value = useMemo(() => ({ count: state.count, clear }), [state.count, clear]);

  return <AdminSupportInboxContext.Provider value={value}>{children}</AdminSupportInboxContext.Provider>;
}

export function useAdminSupportInbox(): AdminSupportInboxValue {
  return useContext(AdminSupportInboxContext);
}

/** Rendered by /admin/support: the visit itself is what clears the badges. */
export function AdminSupportInboxSeen() {
  const { clear } = useAdminSupportInbox();
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
