"use client";

import { useEffect, useState } from "react";
import type { AdminRecentSignup } from "@/lib/admin-overview";

// There is no push channel or background job behind this list -- it is a
// heartbeat, not literal real-time presence, same rationale as
// AdminOnlineNowTile (which this polling shape mirrors). Kept as its own
// independent poll rather than sharing state with that tile: two lightweight
// requests to the same cheap endpoint is simpler than wiring shared state
// for one page.
const POLL_INTERVAL_MS = 12_000;
const POLL_TIMEOUT_MS = 8_000;

interface AdminRecentSignupsFeedProps {
  initialSignups: AdminRecentSignup[];
}

type OverviewPollResponse = { stats?: { recentSignups?: unknown } };

function isRecentSignup(value: unknown): value is AdminRecentSignup {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.email === "string" &&
    (record.name === null || typeof record.name === "string") &&
    typeof record.createdAt === "string" &&
    (record.timezone === null || typeof record.timezone === "string")
  );
}

/** Coarse "how long ago" -- polled every ~12s, so second-level precision would be misleading anyway. */
function relativeJoinTime(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** The learner's own local time, from their reported zone, defaulting to UTC when unknown. */
function localJoinTime(createdAt: string, timezone: string | null): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: timezone ?? "UTC",
  }).format(new Date(createdAt));
}

export function AdminRecentSignupsFeed({ initialSignups }: AdminRecentSignupsFeedProps) {
  const [signups, setSignups] = useState(initialSignups);
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
        const nextSignups = payload.stats?.recentSignups;
        if (stopped) return;

        if (Array.isArray(nextSignups) && nextSignups.every(isRecentSignup)) {
          setSignups(nextSignups);
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
          <p className="text-sm font-medium">Recent signups</p>
        </div>
        {isStale && <span className="text-xs text-zinc-400 dark:text-zinc-500">May be outdated</span>}
      </div>
      {signups.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">No signups yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {signups.map((signup) => (
            <li key={signup.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="font-medium">{signup.name ?? signup.email}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {relativeJoinTime(signup.createdAt)} ·{" "}
                {localJoinTime(signup.createdAt, signup.timezone)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
