"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RETRY_TIMEOUT_MS = 30_000;

export type SupportHubspotRetryOutcome = { synced: true } | { synced: false; message: string };

/**
 * syncSupportRequestToHubspot makes several sequential HubSpot API round
 * trips, so this can take a few seconds -- longer than a typical admin
 * mutation, hence the longer timeout than e.g. the access-code delete route.
 * A client-side timeout here only stops this browser from waiting; the
 * server-side sync is idempotent (see syncSupportRequestToHubspot), so
 * retrying again after an ambiguous outcome is always safe.
 */
export async function requestSupportHubspotRetry(
  requestId: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = RETRY_TIMEOUT_MS,
): Promise<SupportHubspotRetryOutcome> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`/api/admin/support/${requestId}/retry-hubspot`, {
      method: "POST",
      signal: controller.signal,
    });
    if (response.ok) return { synced: true };

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return {
      synced: false,
      message: body?.error ?? "Could not sync this request to HubSpot. Please try again.",
    };
  } catch (caught) {
    const wasTimeout = caught instanceof DOMException && caught.name === "AbortError";
    return {
      synced: false,
      message: wasTimeout
        ? "The request took too long to confirm. Reload to check whether it went through before retrying."
        : "Could not reach the admin service. Please try again.",
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Only shown for a request that hasn't fully synced yet (see
 * /admin/support): once hubspotSyncAttempts reaches MAX_HUBSPOT_SYNC_ATTEMPTS
 * the daily retry cron stops picking the row back up on its own, and this is
 * the only remaining way to unstick it short of a database change.
 */
export function AdminSupportRetryButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    if (isRetrying) return;

    setIsRetrying(true);
    setError(null);
    try {
      const outcome = await requestSupportHubspotRetry(requestId);
      if (!outcome.synced) setError(outcome.message);
    } finally {
      router.refresh();
      setIsRetrying(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => void retry()}
        disabled={isRetrying}
        className="rounded-full border border-black/[.15] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.08]"
      >
        {isRetrying ? "Retrying…" : "Retry HubSpot sync"}
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-xs text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
