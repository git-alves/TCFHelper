"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_RESOLUTION_NOTE_MAX_CHARS } from "@/lib/support-resolution-limits";

const GENERIC_ERROR = "Could not edit this reply. Please try again.";

/**
 * Shown on a RESOLVED request whose notice the learner has not opened,
 * dismissed or answered yet. The server only edits the reply under those same
 * conditions, so a learner who opens the notice while the admin is typing
 * turns the save into a 409, never a change to text they already read.
 */
export function AdminSupportEditReply({ requestId, note }: { requestId: string; note: string | null }) {
  const router = useRouter();
  const fieldId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set after a 409: the reply is locked, so the editor gives way to the
  // message and a way to load the learner's current state.
  const [lockedMessage, setLockedMessage] = useState<string | null>(null);

  async function save() {
    const trimmed = value.trim();
    if (isSaving || !trimmed) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/support/${requestId}/reply`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed }),
      });
      if (response.ok) {
        setIsOpen(false);
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (response.status === 409) {
        setIsOpen(false);
        setLockedMessage(body?.error ?? GENERIC_ERROR);
        return;
      }
      setError(body?.error ?? GENERIC_ERROR);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setIsSaving(false);
    }
  }

  function cancel() {
    setIsOpen(false);
    setError(null);
    setValue(note ?? "");
  }

  if (lockedMessage) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {lockedMessage}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="text-xs font-medium text-violet-700 underline dark:text-violet-300"
        >
          Refresh
        </button>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-2 text-xs font-medium text-violet-700 underline dark:text-violet-300"
      >
        Edit reply
      </button>
    );
  }

  return (
    <div className="mt-2 flex max-w-md flex-col gap-2">
      <label htmlFor={fieldId} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Reply to the learner
      </label>
      <textarea
        id={fieldId}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={SUPPORT_RESOLUTION_NOTE_MAX_CHARS}
        rows={3}
        disabled={isSaving}
        className="w-full resize-y rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/[.2]"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={isSaving || !value.trim()}
          className="rounded-full bg-violet-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save reply"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={isSaving}
          className="rounded-full border border-black/[.15] px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.08]"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
