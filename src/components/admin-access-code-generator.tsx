"use client";

import { type FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/copy-button";

type GeneratedAccessCode = { code: string };
type GenerateResponse = { accessCode?: GeneratedAccessCode; error?: string };

export function AdminAccessCodeGenerator() {
  const router = useRouter();
  const noteId = useId();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState<GeneratedAccessCode | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() || null }),
      });
      const payload = (await response.json().catch(() => null)) as GenerateResponse | null;

      if (!response.ok || !payload?.accessCode) {
        setError(payload?.error ?? "Could not generate a code. Please try again.");
        return;
      }

      setJustCreated(payload.accessCode);
      setNote("");
      router.refresh();
    } catch {
      setError("Could not reach the admin service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full max-w-sm">
          <label htmlFor={noteId} className="block text-sm font-medium">
            Note (optional)
          </label>
          <input
            id={noteId}
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Reddit AMA cohort"
            maxLength={280}
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2]"
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {isSubmitting ? "Generating…" : "Generate code"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {justCreated && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-violet-500/40 bg-violet-500/[.06] px-4 py-3">
          <p className="sr-only" role="status" aria-live="polite">New access code generated and ready to copy.</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">New code:</p>
          <code className="font-mono text-sm font-semibold">{justCreated.code}</code>
          <CopyButton value={justCreated.code} label="Copy the new access code" />
        </div>
      )}
    </div>
  );
}
