"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

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

/**
 * Rendered by /admin/support. After it mounts (a committed visit, not a
 * server render that a prefetch or refresh could run on its own) it tells the
 * server the inbox was seen, handing back the page's render timestamp so a
 * ticket that arrived during the render still counts as new. Only a
 * successful answer clears the shared badge count; a failure leaves the badge
 * as it was, with no error UI, and the next visit tries again.
 */
export function AdminSupportInboxSeen({ visitStartedAt }: { visitStartedAt: string }) {
  const { clear } = useAdminSupportInbox();
  // React may run an effect twice in development; one POST per visit is plenty.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    void fetch("/api/admin/support/inbox/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seenAt: visitStartedAt }),
    })
      .then((response) => {
        if (response.ok) clear();
      })
      .catch(() => undefined);
  }, [clear, visitStartedAt]);

  return null;
}
