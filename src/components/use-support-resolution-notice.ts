"use client";

import { useCallback, useState } from "react";
import type { SupportResolutionNotice } from "@/lib/support-resolution";

export type SupportResolutionAnswer = "WORKED" | "STILL_BROKEN";

type ActionRoute = "feedback" | "dismiss";

interface NoticeState {
  // The id the server rendered with, so a fresh server value (a full page
  // load, or a router refresh) replaces what the client has since changed.
  serverNoticeId: string | null;
  notice: SupportResolutionNotice | null;
}

/**
 * Client state for the support-resolution notice. The first notice arrives
 * from the layout, which already runs on every full page load: there is no
 * fetch on mount, no polling and no refetch on navigation. After an answer or
 * a dismissal the route returns the learner's next pending notice (or null),
 * which becomes the new state, so a second pending ticket needs no extra
 * request either.
 */
export function useSupportResolutionNotice(initialNotice: SupportResolutionNotice | null) {
  const serverNoticeId = initialNotice?.id ?? null;
  const [state, setState] = useState<NoticeState>({ serverNoticeId, notice: initialNotice });
  if (state.serverNoticeId !== serverNoticeId) {
    setState({ serverNoticeId, notice: initialNotice });
  }

  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const notice = state.notice;

  const open = useCallback(() => {
    if (!notice) return;
    setHasError(false);
    setIsOpen(true);
    // Best effort: lets the admin see the notice was opened. Never blocks the
    // modal and a failure changes nothing for the learner.
    void fetch(`/api/support/${notice.id}/seen`, { method: "POST" }).catch(() => undefined);
  }, [notice]);

  const send = useCallback(
    async (route: ActionRoute, body?: { feedback: SupportResolutionAnswer }) => {
      if (!notice || isBusy) return;
      setIsBusy(true);
      setHasError(false);
      try {
        const response = await fetch(`/api/support/${notice.id}/${route}`, {
          method: "POST",
          ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
        });

        let next: SupportResolutionNotice | null = null;
        if (response.ok) {
          const data = (await response.json().catch(() => null)) as { next?: SupportResolutionNotice | null } | null;
          next = data?.next ?? null;
        } else if (response.status !== 404 && response.status !== 409) {
          throw new Error("Support notice request failed");
        }
        // 404/409: this notice was already answered, dismissed or reopened
        // elsewhere. It is no longer pending, so drop it rather than show a
        // notice that can never be acted on.

        setState((current) => ({ ...current, notice: next }));
        setIsOpen(false);
      } catch {
        setHasError(true);
      } finally {
        setIsBusy(false);
      }
    },
    [notice, isBusy],
  );

  return {
    notice,
    isOpen: isOpen && notice !== null,
    isBusy,
    hasError,
    open,
    answer: useCallback((feedback: SupportResolutionAnswer) => send("feedback", { feedback }), [send]),
    dismiss: useCallback(() => send("dismiss"), [send]),
  };
}
