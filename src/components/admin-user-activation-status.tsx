"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface AdminUserActivationStatusProps {
  userId: string;
  email: string;
  activationStamp: string | null;
  isCurrentAdmin: boolean;
}

/**
 * Activation is distinct from blocking: it removes only the learner's current
 * code admission, preserving their account and work. The spent code stays
 * spent, so recovery is intentionally an owner-issued new code.
 */
export function AdminUserActivationStatus({
  userId,
  email,
  activationStamp,
  isCurrentAdmin,
}: AdminUserActivationStatusProps) {
  const router = useRouter();
  const [deactivatedActivationStamp, setDeactivatedActivationStamp] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  // This is an optimistic local transition for the currently displayed
  // admission only. A refreshed replacement admission has a new redemption
  // timestamp, so it wins over the old local reset without an effect-driven
  // state synchronization or a misleading stale "Awaiting" control.
  const isActivated =
    activationStamp !== null && deactivatedActivationStamp !== activationStamp;

  async function deactivateAccess() {
    if (isSaving || !isActivated || isCurrentAdmin) return;

    setIsSaving(true);
    setStatus("Deactivating access…");
    try {
      const response = await fetch(`/api/admin/users/${userId}/activation/reset`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as { error?: string; reset?: boolean } | null;
      if (!response.ok) {
        setStatus(body?.error ?? "Could not deactivate access. Please try again.");
        return;
      }

      setDeactivatedActivationStamp(activationStamp);
      setStatus(
        body?.reset === false
          ? "Access was already deactivated. Send a new code to restore access."
          : "Access deactivated. Send a new code to restore access.",
      );
      router.refresh();
    } catch {
      setStatus("Could not deactivate access. Check your connection and try again.");
    } finally {
      setIsSaving(false);
      setIsConfirming(false);
    }
  }

  // The sole owner never consumes a code, so a deactivation control would be
  // misleading as well as useless. The API independently enforces this.
  if (isCurrentAdmin) return null;

  return (
    <section className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]" aria-labelledby="activation-heading">
      <div className="mb-3">
        <h2 id="activation-heading" className="text-base font-semibold">Activation</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {isActivated
            ? "Removes this learner’s current access-code admission. Their work stays intact, but the code they used remains permanently spent. Send a new code to restore access."
            : "This learner is awaiting a newly issued access code. Their work and account remain intact."}
        </p>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
      {isActivated ? (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          disabled={isSaving}
          className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          {isSaving ? "Deactivating access…" : "Deactivate access"}
        </button>
      ) : (
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Awaiting new code
        </span>
      )}
      <ConfirmDialog
        open={isConfirming}
        title="Deactivate learner access?"
        description={`${email} will need a newly issued access code to continue. Their current code stays permanently spent.`}
        confirmLabel={isSaving ? "Deactivating…" : "Deactivate access"}
        cancelLabel="Cancel"
        isConfirming={isSaving}
        onConfirm={() => void deactivateAccess()}
        onCancel={() => !isSaving && setIsConfirming(false)}
      />
      {status && !isSaving && (
        <p className="mt-3 text-xs leading-5 text-zinc-600 dark:text-zinc-400">{status}</p>
      )}
    </section>
  );
}
