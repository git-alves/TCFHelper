"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AdminEventLogItem } from "@/lib/admin-event-log";
import { formatRelativeTime } from "@/lib/relative-time";

// Same heartbeat-not-push rationale and polling shape as AdminOnlineNowTile
// and AdminRecentSignupsFeed. Kept as its own independent poll of the same
// endpoint rather than merged state -- see AdminRecentSignupsFeed for why.
const POLL_INTERVAL_MS = 12_000;
const POLL_TIMEOUT_MS = 8_000;

const SEVERITY_SYMBOLS: Record<string, string> = { INFO: "🟢", WARN: "🟡", ERROR: "🔴" };

interface AdminRecentActivityFeedProps {
  initialEvents: AdminEventLogItem[];
}

type OverviewPollResponse = { stats?: { recentActivity?: unknown } };

function isEventLogItem(value: unknown): value is AdminEventLogItem {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.occurredAt === "string" &&
    typeof record.severity === "string" &&
    typeof record.message === "string"
  );
}

export function AdminRecentActivityFeed({ initialEvents }: AdminRecentActivityFeedProps) {
  const [events, setEvents] = useState(initialEvents);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    let stopped = false;
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

      if (document.hidden) {
        scheduleNext();
        return;
      }

      isPolling = true;
      controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller?.abort(), POLL_TIMEOUT_MS);
      try {
        const response = await fetch("/api/admin/overview", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Unexpected status ${response.status}`);

        const payload = (await response.json()) as OverviewPollResponse;
        const nextEvents = payload.stats?.recentActivity;
        if (stopped) return;

        if (Array.isArray(nextEvents) && nextEvents.every(isEventLogItem)) {
          setEvents(nextEvents);
          setIsStale(false);
        } else {
          setIsStale(true);
        }
      } catch {
        if (!stopped) setIsStale(true);
      } finally {
        clearTimeout(timeoutHandle);
        isPolling = false;
        scheduleNext();
      }
    }

    function handleVisibilityChange() {
      if (document.hidden || isPolling) return;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      setIsStale(true);
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={
              isStale
                ? "h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600"
                : "online-now-dot h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
            }
            aria-hidden="true"
          />
          <p className="text-sm font-medium">Recent activity</p>
        </div>
        {isStale && <span className="text-xs text-zinc-400 dark:text-zinc-500">May be outdated</span>}
      </div>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No activity yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span>
                <span aria-hidden="true">{SEVERITY_SYMBOLS[event.severity] ?? "•"}</span>{" "}
                {event.message}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatRelativeTime(event.occurredAt)}
                {event.userId && (
                  <>
                    {" · "}
                    <Link
                      href={`/admin/users/${encodeURIComponent(event.userId)}`}
                      className="text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
                    >
                      {event.userEmail ?? event.userId}
                    </Link>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
