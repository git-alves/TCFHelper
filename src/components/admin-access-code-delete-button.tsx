"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface AdminAccessCodeDeleteButtonProps {
  accessCodeId: string;
  code: string;
}

// Bounds the request so a hung/slow response can never leave the confirm
// dialog stuck open: Cancel and Escape are disabled while isDeleting is
// true, and without a deadline that would otherwise last forever.
const DELETE_TIMEOUT_MS = 10_000;
// Observed only for an ambiguous outcome (timeout or network error, see
// below): the browser aborting a fetch does not stop a request the server
// already started. The server itself now bounds how long a delete statement
// can run (see DELETE_STATEMENT_TIMEOUT_MS in admin-access-codes.ts) and
// responds with a definite, non-ambiguous result well inside this client's
// own timeout -- so a genuinely blocked mutation can no longer be the cause
// of an outcome reaching this catch block at all. What remains here is the
// narrower case a server deadline cannot close: the mutation actually
// succeeded, but its response was lost in transit before the client saw it.
// The caller's own router.refresh() runs unconditionally right after this
// function resolves (see deleteCode's "finally" block) -- waiting out this
// grace period first, instead of resolving immediately, gives that refresh
// higher odds of observing that eventual state rather than reading a stale
// row a moment before it lands. It is a best-effort mitigation for that
// residual case, not a guarantee.
const RECONCILE_GRACE_PERIOD_MS = 3_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type AccessCodeDeleteOutcome = { deleted: true } | { deleted: false; message: string };

/**
 * Aborting the browser fetch only stops the client from waiting on a
 * response -- it does not guarantee the server stopped processing the
 * request. A "timed out" delete can still complete moments later, and a 404
 * on retry can mean exactly that: the code was already removed by the
 * earlier attempt, not that nothing happened. Every non-success path here is
 * therefore reported as an uncertain outcome, never a definite failure, so
 * the caller always reconciles its view of the list instead of leaving a
 * stale row next to a misleading error.
 */
export async function requestAccessCodeDeletion(
  accessCodeId: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = DELETE_TIMEOUT_MS,
  graceMs: number = RECONCILE_GRACE_PERIOD_MS,
): Promise<AccessCodeDeleteOutcome> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`/api/admin/access-codes/${accessCodeId}`, {
      method: "DELETE",
      signal: controller.signal,
    });
    if (response.ok) return { deleted: true };

    if (response.status === 404) {
      return {
        deleted: false,
        message: "This code was already removed. The list has been refreshed to show its current state.",
      };
    }

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return {
      deleted: false,
      message:
        body?.error ??
        "Could not delete this code. The list has been refreshed to show its current state — please try again.",
    };
  } catch (caught) {
    const wasTimeout = caught instanceof DOMException && caught.name === "AbortError";
    await wait(graceMs);
    return {
      deleted: false,
      message: wasTimeout
        ? "The request took too long to confirm. The list has been refreshed — if this code is still listed, try deleting it again."
        : "Could not reach the admin service. The list has been refreshed to show its current state — please try again.",
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Only ever rendered for a code with no live admission (see
 * deleteAccessCode): deleting a code currently granting access would sever
 * that learner's admission, so this control does not offer that path at all.
 */
export function AdminAccessCodeDeleteButton({ accessCodeId, code }: AdminAccessCodeDeleteButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteCode() {
    if (isDeleting) return;

    setIsDeleting(true);
    setError(null);
    try {
      const outcome = await requestAccessCodeDeletion(accessCodeId);
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
    <div>
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        disabled={isDeleting}
        aria-label={`Delete access code ${code}`}
        className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-medium text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
      >
        {isDeleting ? "Deleting…" : "Delete"}
      </button>
      <ConfirmDialog
        open={isConfirming}
        title="Delete this access code?"
        description={`${code} will be permanently removed and can never be redeemed. This cannot be undone.`}
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        isConfirming={isDeleting}
        onConfirm={() => void deleteCode()}
        onCancel={() => !isDeleting && setIsConfirming(false)}
      />
      {error && (
        <p role="alert" className="mt-1 max-w-[12rem] text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
