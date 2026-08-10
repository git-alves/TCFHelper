"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface AdminUserAccountStatusProps {
  userId: string;
  email: string;
  isBlocked: boolean;
  isCurrentAdmin: boolean;
  compact?: boolean;
}

/**
 * Blocking takes confirmation because it changes another person's ability to
 * use the product. Unblocking is deliberately one click: it is the direct,
 * reversible recovery action if an owner made a mistake.
 */
export function AdminUserAccountStatus({
  userId,
  email,
  isBlocked: initialBlocked,
  isCurrentAdmin,
  compact = false,
}: AdminUserAccountStatusProps) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(initialBlocked);
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function setAccountBlocked(nextBlocked: boolean) {
    if (isSaving || isCurrentAdmin) return;

    setIsSaving(true);
    setStatus(nextBlocked ? "Blocking access…" : "Restoring access…");
    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBlocked: nextBlocked }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setStatus(body?.error ?? "Could not update account access. Please try again.");
        return;
      }

      setIsBlocked(nextBlocked);
      setStatus(nextBlocked ? `Blocked access for ${email}.` : `Restored access for ${email}.`);
      router.refresh();
    } catch {
      setStatus("Could not update account access. Check your connection and try again.");
    } finally {
      setIsSaving(false);
      setConfirmingBlock(false);
    }
  }

  if (isCurrentAdmin) {
    return (
      <div className={compact ? "flex flex-col gap-1" : "rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]"}>
        <span className="text-sm font-medium">Owner account</span>
        {!compact && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            The owner cannot be blocked from this dashboard.
          </p>
        )}
      </div>
    );
  }

  const buttonClass = compact
    ? "rounded-full border border-black/[.15] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.06]"
    : isBlocked
      ? "rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
      : "rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-800 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30";

  return (
    <div className={compact ? "flex flex-col items-start gap-2" : "rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]"}>
      {!compact && (
        <div className="mb-3">
          <h2 className="text-base font-semibold">Account access</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {isBlocked
              ? "This learner cannot open MyTCFLab until you restore access."
              : "Blocking quietly signs this learner out to the public page on their next protected request."}
          </p>
        </div>
      )}
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
      {isBlocked ? (
        <button
          type="button"
          onClick={() => void setAccountBlocked(false)}
          disabled={isSaving}
          className={buttonClass}
        >
          {isSaving ? "Restoring access…" : "Unblock user"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingBlock(true)}
          disabled={isSaving}
          className={buttonClass}
        >
          {isSaving ? "Blocking…" : "Block user"}
        </button>
      )}
      <ConfirmDialog
        open={confirmingBlock}
        title="Block learner access?"
        description={`${email} will be quietly signed out to the public page and will not be able to use MyTCFLab until you unblock them.`}
        confirmLabel={isSaving ? "Blocking…" : "Block user"}
        cancelLabel="Cancel"
        isConfirming={isSaving}
        onConfirm={() => void setAccountBlocked(true)}
        onCancel={() => !isSaving && setConfirmingBlock(false)}
      />
      {status && !isSaving && (
        <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">{status}</p>
      )}
    </div>
  );
}
