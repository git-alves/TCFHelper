"use client";

import { type FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "@/components/copy-button";

const MAX_BATCH_SIZE = 100;

type GeneratedAccessCode = { code: string };
type GenerateResponse = { accessCodes?: GeneratedAccessCode[]; error?: string };

export function AdminAccessCodeGenerator() {
  const router = useRouter();
  const noteId = useId();
  const validityGroupId = useId();
  const daysId = useId();
  const countId = useId();
  const [note, setNote] = useState("");
  const [isLifetime, setIsLifetime] = useState(true);
  const [validityDays, setValidityDays] = useState("30");
  const [count, setCount] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState<GeneratedAccessCode[] | null>(null);

  const parsedDays = Number.parseInt(validityDays, 10);
  const parsedCount = Number.parseInt(count, 10);
  const canSubmit =
    !isSubmitting &&
    (isLifetime || (Number.isInteger(parsedDays) && parsedDays >= 1)) &&
    Number.isInteger(parsedCount) &&
    parsedCount >= 1 &&
    parsedCount <= MAX_BATCH_SIZE;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: note.trim() || null,
          validityDays: isLifetime ? null : parsedDays,
          count: parsedCount,
        }),
      });
      const payload = (await response.json().catch(() => null)) as GenerateResponse | null;

      if (!response.ok || !payload?.accessCodes) {
        setError(payload?.error ?? "Could not generate codes. Please try again.");
        return;
      }

      setJustCreated(payload.accessCodes);
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
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

          <div>
            <label htmlFor={countId} className="block text-sm font-medium">
              Quantity
            </label>
            <input
              id={countId}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_BATCH_SIZE}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              disabled={isSubmitting}
              className="mt-2 w-24 rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2]"
            />
          </div>
        </div>

        <fieldset>
          <legend id={validityGroupId} className="text-sm font-medium">
            Validity
          </legend>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={validityGroupId}
                checked={isLifetime}
                onChange={() => setIsLifetime(true)}
                disabled={isSubmitting}
              />
              Lifetime
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={validityGroupId}
                checked={!isLifetime}
                onChange={() => setIsLifetime(false)}
                disabled={isSubmitting}
              />
              Expires
              <input
                id={daysId}
                type="number"
                inputMode="numeric"
                min={1}
                value={validityDays}
                onChange={(event) => {
                  setIsLifetime(false);
                  setValidityDays(event.target.value);
                }}
                disabled={isSubmitting}
                aria-label="Days of access after redemption"
                className="w-20 rounded-lg border border-black/[.15] bg-background px-3 py-1.5 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2]"
              />
              days after redemption
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={!canSubmit}
          className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {isSubmitting ? "Generating…" : parsedCount > 1 ? `Generate ${count} codes` : "Generate code"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {justCreated && justCreated.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-violet-500/40 bg-violet-500/[.06] px-4 py-3">
          <p className="sr-only" role="status" aria-live="polite">
            {justCreated.length === 1
              ? "New access code generated and ready to copy."
              : `${justCreated.length} new access codes generated and ready to copy.`}
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {justCreated.length === 1 ? "New code:" : `${justCreated.length} new codes:`}
            </p>
            {justCreated.length > 1 && (
              <CopyButton
                value={justCreated.map((accessCode) => accessCode.code).join("\n")}
                label="Copy all new access codes"
              />
            )}
          </div>
          <ul className="flex flex-col gap-1.5">
            {justCreated.map((accessCode) => (
              <li key={accessCode.code} className="flex items-center gap-2">
                <code className="font-mono text-sm font-semibold">{accessCode.code}</code>
                <CopyButton value={accessCode.code} label={`Copy the new access code ${accessCode.code}`} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
