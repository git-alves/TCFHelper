"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminAccessCodeDeleteButton } from "@/components/admin-access-code-delete-button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import type { AdminAccessCode } from "@/lib/admin-access-codes";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function validityLabel(validityDays: number | null) {
  return validityDays === null ? "Lifetime" : `${validityDays} day${validityDays === 1 ? "" : "s"}`;
}

/**
 * expiresAt is derived (redeemedAt + validityDays), not a stored flag, so a
 * timed code can read as expired here before the DB reflects it -- actual
 * detachment only happens lazily, on the learner's own next request. Naming
 * that gap explicitly keeps this table honest instead of implying the
 * learner still has live access.
 */
function statusText(accessCode: AdminAccessCode) {
  if (!accessCode.redeemedAt) return null;
  if (!accessCode.redeemedByUserEmail) {
    return `Permanently spent on ${formatDate(accessCode.redeemedAt)} — no active admission`;
  }
  if (accessCode.expiresAt && new Date(accessCode.expiresAt).getTime() <= Date.now()) {
    return `Redeemed by ${accessCode.redeemedByUserEmail} — expired ${formatDate(accessCode.expiresAt)}, access will be removed on their next visit`;
  }
  const redeemed = `Redeemed by ${accessCode.redeemedByUserEmail} on ${formatDate(accessCode.redeemedAt)}`;
  return accessCode.expiresAt ? `${redeemed} — expires ${formatDate(accessCode.expiresAt)}` : redeemed;
}

// Matches deleteAccessCode's own eligibility check: a code with no active
// admission (never redeemed, or already detached) can be deleted without
// affecting anyone's access.
function isDeletable(accessCode: AdminAccessCode) {
  return accessCode.redeemedByUserEmail === null;
}

const BULK_DELETE_TIMEOUT_MS = 10_000;
// Observed only when the outcome is ambiguous (see below): the browser
// aborting a fetch does not stop a request the server already started, so a
// late-completing delete can still commit after that abort. The caller's
// own router.refresh() runs unconditionally right after this function
// resolves (see deleteSelected's "finally" block) -- waiting out this grace
// period first, instead of resolving immediately, gives that refresh far
// higher odds of actually observing the eventual state rather than reading
// a stale row a moment before the late delete commits underneath it. It is
// a best-effort mitigation, not a guarantee: an unusually slow server
// mutation can still outlast it.
const RECONCILE_GRACE_PERIOD_MS = 3_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AccessCodesBulkDeleteOutcome =
  | { deletedCount: number; requestedCount: number }
  | { failed: true; message: string; ambiguous: boolean };

/**
 * Shares the single-delete control's lesson: a client-side abort does not
 * cancel a server-side delete already in progress, so every non-success
 * path (timeout, non-ok response, network error) is reported as uncertain
 * rather than a definite failure, and the caller reconciles its list
 * regardless of outcome instead of trusting what it last rendered. Only the
 * catch-block paths (timeout, network error) are "ambiguous" -- a response
 * that actually arrived, ok or not, reflects the server's real, already
 * final state and needs no grace period before the caller reconciles.
 */
export async function requestAccessCodesBulkDeletion(
  ids: string[],
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = BULK_DELETE_TIMEOUT_MS,
  graceMs: number = RECONCILE_GRACE_PERIOD_MS,
): Promise<AccessCodesBulkDeleteOutcome> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl("/api/admin/access-codes/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return {
        failed: true,
        ambiguous: false,
        message:
          body?.error ??
          "Could not delete the selected codes. The list has been refreshed to show its current state.",
      };
    }

    return (await response.json()) as { deletedCount: number; requestedCount: number };
  } catch (caught) {
    const wasTimeout = caught instanceof DOMException && caught.name === "AbortError";
    await wait(graceMs);
    return {
      failed: true,
      ambiguous: true,
      message: wasTimeout
        ? "The request took too long to confirm. The list has been refreshed — check its current state before trying again."
        : "Could not reach the admin service. The list has been refreshed to show its current state — please try again.",
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export function AdminAccessCodesTable({ accessCodes }: { accessCodes: AdminAccessCode[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const deletableIds = accessCodes.filter(isDeletable).map((code) => code.id);
  const selectedDeletableIds = deletableIds.filter((id) => selectedIds.has(id));
  const allDeletableSelected = deletableIds.length > 0 && selectedDeletableIds.length === deletableIds.length;

  function toggleOne(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAllDeletable() {
    setSelectedIds(allDeletableSelected ? new Set() : new Set(deletableIds));
  }

  async function deleteSelected() {
    if (isDeleting || selectedDeletableIds.length === 0) return;

    setIsDeleting(true);
    setMessage(null);
    try {
      const outcome = await requestAccessCodesBulkDeletion(selectedDeletableIds);
      if ("failed" in outcome) {
        setMessage(outcome.message);
      } else if (outcome.deletedCount < outcome.requestedCount) {
        setMessage(
          `${outcome.deletedCount} of ${outcome.requestedCount} selected codes were deleted. The rest may have changed status in the meantime — the list has been refreshed.`,
        );
      }
      setSelectedIds(new Set());
    } finally {
      // Reconciles the list on every outcome, not just success -- see
      // requestAccessCodesBulkDeletion.
      router.refresh();
      setIsDeleting(false);
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {selectedDeletableIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/[.1] bg-black/[.02] px-4 py-3 dark:border-white/[.15] dark:bg-white/[.03]">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {selectedDeletableIds.length === 1
              ? "1 code selected"
              : `${selectedDeletableIds.length} codes selected`}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              disabled={isDeleting}
              className="text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 disabled:cursor-not-allowed disabled:opacity-60 dark:text-violet-300 dark:hover:text-violet-100"
            >
              Clear selection
            </button>
            <button
              type="button"
              onClick={() => setIsConfirming(true)}
              disabled={isDeleting}
              className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              {isDeleting ? "Deleting…" : "Delete selected"}
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {message}
        </p>
      )}
      <ConfirmDialog
        open={isConfirming}
        title={`Delete ${selectedDeletableIds.length === 1 ? "this access code" : `these ${selectedDeletableIds.length} access codes`}?`}
        description="Deleted codes are permanently removed and can never be redeemed. This cannot be undone."
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        isConfirming={isDeleting}
        onConfirm={() => void deleteSelected()}
        onCancel={() => !isDeleting && setIsConfirming(false)}
      />
      <div className="overflow-x-auto rounded-xl border border-black/[.1] dark:border-white/[.15]">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-black/[.1] text-xs font-medium text-zinc-500 dark:border-white/[.15] dark:text-zinc-400">
            <tr>
              <th scope="col" className="px-4 py-3">
                {deletableIds.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allDeletableSelected}
                    onChange={toggleAllDeletable}
                    aria-label="Select all deletable codes"
                  />
                )}
              </th>
              <th scope="col" className="px-4 py-3">Code</th>
              <th scope="col" className="px-4 py-3">Note</th>
              <th scope="col" className="px-4 py-3">Validity</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[.08] dark:divide-white/[.1]">
            {accessCodes.map((accessCode) => {
              const status = statusText(accessCode);
              const deletable = isDeletable(accessCode);
              return (
                <tr key={accessCode.id}>
                  <td className="px-4 py-3">
                    {deletable && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(accessCode.id)}
                        onChange={() => toggleOne(accessCode.id)}
                        aria-label={`Select access code ${accessCode.code}`}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="font-mono">{accessCode.code}</code>
                      <CopyButton value={accessCode.code} label={`Copy code ${accessCode.code}`} />
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-400">{accessCode.note ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{validityLabel(accessCode.validityDays)}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDate(accessCode.createdAt)}</td>
                  <td className="px-4 py-3">
                    {status ? (
                      <span className="text-zinc-600 dark:text-zinc-400">{status}</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Unredeemed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {deletable ? (
                      <AdminAccessCodeDeleteButton accessCodeId={accessCode.id} code={accessCode.code} />
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">In use</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
