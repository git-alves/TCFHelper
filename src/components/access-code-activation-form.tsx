"use client";

import { type FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";

type RedemptionResponse = {
  activated?: boolean;
  error?: string;
};

export function AccessCodeActivationForm() {
  const router = useRouter();
  const errorId = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = code.trim().length > 0 && !isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/access-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const payload = (await response.json().catch(() => null)) as RedemptionResponse | null;

      if (!response.ok || payload?.activated !== true) {
        setError(payload?.error ?? "We could not activate your account. Please try again.");
        return;
      }

      // Replace rather than push: an activated learner should not land back
      // on a now-obsolete activation form through the browser Back button.
      router.replace("/tasks");
      router.refresh();
    } catch {
      setError("We could not reach the activation service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="access-code" className="text-sm font-medium">
          Access code
        </label>
        <input
          id="access-code"
          name="access-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck="false"
          required
          disabled={isSubmitting}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="rounded-xl border border-black/[.15] bg-transparent px-4 py-3 font-mono text-base uppercase tracking-wide outline-none transition-colors placeholder:text-zinc-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:focus:border-violet-400"
          placeholder="e.g. TCF-AB12-CD34-EF56-GH78"
        />
      </div>

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
      >
        {isSubmitting ? "Activating…" : "Activate account"}
      </button>
    </form>
  );
}
