"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface AdminSupportDeleteButtonProps {
  requestId: string;
  // Whether this request has already synced to HubSpot. Deleting only ever
  // removes the local row and its attachment -- the confirm copy must not
  // imply an already-synced external ticket disappears too.
  isSyncedToHubspot: boolean;
}

// Bounds the request so a hung/slow response can never leave the confirm
// dialog stuck open: Cancel and Escape are disabled while isDeleting is
// true, and without a deadline that would otherwise last forever.
const DELETE_TIMEOUT_MS = 10_000;
// Observed only for an ambiguous outcome (timeout or network error) -- see
// AdminAccessCodeDeleteButton's requestAccessCodeDeletion for the full
// rationale this mirrors. The server itself now bounds how long the delete
// statement can run (see DELETE_STATEMENT_TIMEOUT_MS in
// admin-delete-deadline.ts) and responds with a definite, non-ambiguous
// result well inside this client's own timeout, so what remains here is
// only the narrower case a server deadline cannot close: the mutation
// actually succeeded, but its response was lost in transit.
const RECONCILE_GRACE_PERIOD_MS = 3_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SupportRequestDeleteOutcome = { deleted: true } | { deleted: false; message: string };

/**
 * Every non-success path here is reported as an uncertain outcome, never a
 * definite failure -- aborting the browser fetch does not guarantee the
 * server stopped processing it -- so the caller always reconciles its view
 * of the list instead of leaving a stale row next to a misleading error.
 */
export async function requestSupportRequestDeletion(
  requestId: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = DELETE_TIMEOUT_MS,
  graceMs: number = RECONCILE_GRACE_PERIOD_MS,
): Promise<SupportRequestDeleteOutcome> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`/api/admin/support/${requestId}`, {
      method: "DELETE",
      signal: controller.signal,
    });
    if (response.ok) return { deleted: true };

    if (response.status === 404) {
      return {
        deleted: false,
        message: "This request was already removed. The list has been refreshed to show its current state.",
      };
    }

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return {
      deleted: false,
      message:
        body?.error ??
        "Could not delete this request. The list has been refreshed to show its current state — please try again.",
    };
  } catch (caught) {
    const wasTimeout = caught instanceof DOMException && caught.name === "AbortError";
    await wait(graceMs);
    return {
      deleted: false,
      message: wasTimeout
        ? "The request took too long to confirm. The list has been refreshed — if this request is still listed, try deleting it again."
        : "Could not reach the admin service. The list has been refreshed to show its current state — please try again.",
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export function AdminSupportDeleteButton({ requestId, isSyncedToHubspot }: AdminSupportDeleteButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteRequest() {
    if (isDeleting) return;

    setIsDeleting(true);
    setError(null);
    try {
      const outcome = await requestSupportRequestDeletion(requestId);
      if (outcome.deleted) {
        setIsDeleted(true);
      } else {
        setError(outcome.message);
      }
    } finally {
      // Every outcome reconciles the list with actual server state, not
      // just the success path: a reported failure (especially a timeout)
      // does not guarantee the server-side delete did not still complete,
      // so retrying against an unrefreshed, possibly-stale row is unsafe.
      router.refresh();
      setIsDeleting(false);
      setIsConfirming(false);
    }
  }

  if (isDeleted) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        disabled={isDeleting}
        className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
      >
        {isDeleting ? "Deleting…" : "Delete"}
      </button>
      <ConfirmDialog
        open={isConfirming}
        title="Delete this support request?"
        description={
          isSyncedToHubspot
            ? "The local request and attachment will be permanently removed; the ticket already synced to HubSpot will remain there. This cannot be undone."
            : "This request and its attachment (if any) will be permanently removed. This cannot be undone."
        }
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        isConfirming={isDeleting}
        onConfirm={() => void deleteRequest()}
        onCancel={() => !isDeleting && setIsConfirming(false)}
      />
      {error && (
        <p role="alert" className="mt-1 max-w-[16rem] text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
