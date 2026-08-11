"use client";

import { useEffect, useState } from "react";

// There is no push channel or background job behind this number -- it is a
// heartbeat, not literal real-time presence (see touchLastActive and
// ONLINE_THRESHOLD_MS). Polling every ~12s is what "real time" means here:
// frequent enough to feel live without hammering the endpoint.
const POLL_INTERVAL_MS = 12_000;

interface AdminOnlineNowTileProps {
  initialCount: number;
}

export function AdminOnlineNowTile({ initialCount }: AdminOnlineNowTileProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch("/api/admin/overview", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { stats?: { users?: { onlineNow?: unknown } } };
        const nextCount = payload.stats?.users?.onlineNow;
        if (!cancelled && typeof nextCount === "number") {
          setCount(nextCount);
        }
      } catch {
        // A transient poll failure just leaves the last known count on
        // screen rather than surfacing an error state for a cosmetic tile.
      }
    }

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <div className="flex items-center gap-2">
        <span className="online-now-dot h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Online now</p>
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight" aria-live="polite">
        {count.toLocaleString("en-US")}
      </p>
    </div>
  );
}
