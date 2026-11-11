"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_RESOLUTION_NOTE_MAX_CHARS } from "@/lib/support-resolution-limits";

const RESOLVE_TIMEOUT_MS = 15_000;

export type SupportResolveOutcome = { resolved: true } | { resolved: false; message: string };

/**
 * Marks one OPEN request resolved. The server only ever resolves an OPEN
 * request once, so an ambiguous outcome (a timeout) is safe to look at after
 * a reload before trying again: a second attempt answers 409, not a second
 * resolution.
 */
export async function requestSupportResolution(
  requestId: string,
  note: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = RESOLVE_TIMEOUT_MS,
): Promise<SupportResolveOutcome> {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const trimmed = note.trim();
    const response = await fetchImpl(`/api/admin/support/${requestId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trimmed ? { note: trimmed } : {}),
      signal: controller.signal,
    });
    if (response.ok) return { resolved: true };

    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return { resolved: false, message: body?.error ?? "Could not mark this request resolved. Please try again." };
  } catch (caught) {
    const wasTimeout = caught instanceof DOMException && caught.name === "AbortError";
    return {
      resolved: false,
      message: wasTimeout
        ? "The request took too long to confirm. Reload to check whether it went through before retrying."
        : "Could not reach the admin service. Please try again.",
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

/**
 * Shown on an OPEN request only. "Mark as resolved" opens a short note field
 * (optional, shown to the learner) and a confirm step; resolving cannot be
 * undone from here.
 */
export function AdminSupportResolveButton({ requestId, ticketNumber }: { requestId: string; ticketNumber: number }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve() {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const outcome = await requestSupportResolution(requestId, note);
      if (outcome.resolved) {
        setIsOpen(false);
        setNote("");
        router.refresh();
      } else {
        setError(outcome.message);
        // A 409 means someone else already resolved it: show the new state.
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-full border border-emerald-600/40 px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-500/[.08] dark:border-emerald-400/40 dark:text-emerald-300"
        >
          Mark as resolved
        </button>
      </div>
    );
  }

  const noteId = `resolve-note-${requestId}`;
  return (
    <div className="mt-3 flex max-w-md flex-col gap-2">
      <label htmlFor={noteId} className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        Note for the learner (optional) — shown when they open the resolved notice for ticket #{ticketNumber}
      </label>
      <textarea
        id={noteId}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={SUPPORT_RESOLUTION_NOTE_MAX_CHARS}
        rows={3}
        disabled={isSaving}
        className="w-full resize-y rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-white/[.2]"
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {note.length}/{SUPPORT_RESOLUTION_NOTE_MAX_CHARS} · This cannot be undone here; the learner can reopen the ticket
        by saying the problem is still there.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void resolve()}
          disabled={isSaving}
          className="rounded-full bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving…" : `Resolve ticket #${ticketNumber}`}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError(null);
          }}
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
