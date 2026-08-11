"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface AdminAccessCodeDeleteButtonProps {
  accessCodeId: string;
  code: string;
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
      const response = await fetch(`/api/admin/access-codes/${accessCodeId}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not delete this code. Please try again.");
        return;
      }

      setIsDeleted(true);
      router.refresh();
    } catch {
      setError("Could not reach the admin service. Please try again.");
    } finally {
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
