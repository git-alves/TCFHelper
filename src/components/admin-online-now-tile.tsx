"use client";

import { useEffect, useId, useState } from "react";

// There is no push channel or background job behind this number -- it is a
// heartbeat, not literal real-time presence (see touchLastActive and
// ONLINE_THRESHOLD_MS). Polling every ~12s is what "real time" means here:
// frequent enough to feel live without hammering the endpoint.
const POLL_INTERVAL_MS = 12_000;

interface AdminOnlineNowTileProps {
  initialCount: number;
}

type OverviewPollResponse = { stats?: { users?: { onlineNow?: unknown } } };

export function AdminOnlineNowTile({ initialCount }: AdminOnlineNowTileProps) {
  const descriptionId = useId();
  const [count, setCount] = useState(initialCount);
  // True when the displayed count is not known-current: a poll failed, or
  // the response was malformed. Drives a muted dot instead of the pulsing
  // "live" one, so a stuck/failing poll never presents stale data as live.
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let stopped = false;
    // Guards against two fetches ever being in flight together -- e.g. the
    // tab becoming visible again right as a still-pending poll from before
    // it was backgrounded resolves. Only one of self-scheduling (below) or
    // this flag is needed for ordering, but the flag is what makes the
    // visibility-triggered catch-up poll safe to fire without checking
    // exactly what the timer is doing.
    let isPolling = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    function scheduleNext() {
      if (stopped) return;
      timeoutId = setTimeout(() => {
        void runPoll();
      }, POLL_INTERVAL_MS);
    }

    async function runPoll() {
      if (stopped || isPolling) return;
      timeoutId = undefined;

      // Skip the actual request while backgrounded rather than merely not
      // displaying its result: an admin leaving this tab open must not keep
      // resetting their own presence indefinitely just by having it open.
      // (The endpoint itself is also exempted from touching presence for
      // this exact reason -- this is belt-and-suspenders, and saves the
      // network round trip besides.)
      if (document.hidden) {
        scheduleNext();
        return;
      }

      isPolling = true;
      controller = new AbortController();
      try {
        const response = await fetch("/api/admin/overview", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Unexpected status ${response.status}`);

        const payload = (await response.json()) as OverviewPollResponse;
        const nextCount = payload.stats?.users?.onlineNow;
        if (stopped) return;

        if (typeof nextCount === "number") {
          setCount(nextCount);
          setIsStale(false);
        } else {
          setIsStale(true);
        }
      } catch (error) {
        const wasAborted = error instanceof DOMException && error.name === "AbortError";
        if (!stopped && !wasAborted) setIsStale(true);
      } finally {
        isPolling = false;
        scheduleNext();
      }
    }

    function handleVisibilityChange() {
      // Only ever cuts a *pending timer* short, never an in-flight fetch
      // (guarded by isPolling above) -- so returning to the tab feels
      // responsive without ever racing two responses against each other.
      if (document.hidden || isPolling) return;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      void runPoll();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleNext();

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      controller?.abort();
    };
  }, []);

  return (
    <div className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <div className="flex items-center gap-2">
        <span
          className={
            isStale
              ? "h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600"
              : "online-now-dot h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
          }
          aria-hidden="true"
        />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Online now</p>
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight" aria-live="polite" aria-describedby={descriptionId}>
        <span className="sr-only">Online now: </span>
        {count.toLocaleString("en-US")}
      </p>
      <p id={descriptionId} className="sr-only">
        Active in the last 2 minutes.
      </p>
      {isStale && <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Count may be outdated</p>}
    </div>
  );
}
