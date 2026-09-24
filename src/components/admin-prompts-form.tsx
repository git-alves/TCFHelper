"use client";

import { type FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { PromptOverrideDisplay, PromptOverrideKey } from "@/lib/prompt-overrides";

interface AdminPromptsFormProps {
  initialDisplay: PromptOverrideDisplay;
}

const INPUT_CLASSES =
  "mt-2 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 font-mono text-xs leading-5 outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2]";

function PromptBlockField({
  section,
  value,
  onChange,
}: {
  section: PromptOverrideDisplay[PromptOverrideKey];
  value: string;
  onChange: (next: string) => void;
}) {
  const fieldId = useId();
  const isOverridden = section.value !== null;

  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <div className="flex items-baseline justify-between gap-3">
        <legend className="px-1 text-sm font-semibold">{section.label}</legend>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {isOverridden ? "Overridden" : "Using built-in default"}
        </span>
      </div>
      <label htmlFor={fieldId} className="sr-only">
        {section.label}
      </label>
      <textarea
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={section.defaultValue}
        rows={10}
        spellCheck={false}
        className={INPUT_CLASSES}
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Leave blank to use the built-in default shown above as placeholder text.
      </p>
    </fieldset>
  );
}

export function AdminPromptsForm({ initialDisplay }: AdminPromptsFormProps) {
  const router = useRouter();
  const [display, setDisplay] = useState(initialDisplay);
  const [fields, setFields] = useState<Record<PromptOverrideKey, string>>(() =>
    Object.fromEntries(
      (Object.keys(initialDisplay) as PromptOverrideKey[]).map((key) => [key, initialDisplay[key].value ?? ""]),
    ) as Record<PromptOverrideKey, string>,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);

  const keys = Object.keys(display) as PromptOverrideKey[];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSavedJustNow(false);
    setIsSubmitting(true);
    try {
      const body = Object.fromEntries(keys.map((key) => [key, fields[key].trim()]));

      const response = await fetch("/api/admin/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as (PromptOverrideDisplay & { error?: string }) | null;

      if (!response.ok || !payload) {
        setError((payload as { error?: string } | null)?.error ?? "Could not save settings. Please try again.");
        return;
      }

      setDisplay(payload);
      setFields(
        Object.fromEntries(keys.map((key) => [key, payload[key].value ?? ""])) as Record<PromptOverrideKey, string>,
      );
      setSavedJustNow(true);
      router.refresh();
    } catch {
      setError("Could not reach the admin service. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {keys.map((key) => (
        <PromptBlockField
          key={key}
          section={display[key]}
          value={fields[key]}
          onChange={(next) => setFields((prev) => ({ ...prev, [key]: next }))}
        />
      ))}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {isSubmitting ? "Saving…" : "Save settings"}
        </button>
        <p className="sr-only" role="status" aria-live="polite">
          {savedJustNow ? "Settings saved." : ""}
        </p>
        {savedJustNow && !error && <span className="text-sm text-zinc-600 dark:text-zinc-400">Saved.</span>}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
