"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { PromptOverrideDisplay, PromptOverrideKey } from "@/lib/prompt-overrides";

interface AdminPromptsFormProps {
  initialDisplay: PromptOverrideDisplay;
}

type FieldValues = Record<PromptOverrideKey, string>;

const INPUT_CLASSES =
  "mt-2 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 font-mono text-xs leading-5 outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2]";

const ACTION_BUTTON_CLASSES =
  "rounded-full border border-black/[.15] px-3 py-1 text-xs font-medium transition-colors hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] dark:hover:bg-white/[.06]";

function fieldsFromDisplay(display: PromptOverrideDisplay): FieldValues {
  return Object.fromEntries(
    (Object.keys(display) as PromptOverrideKey[]).map((key) => [key, display[key].value ?? ""]),
  ) as FieldValues;
}

function PromptBlockField({
  section,
  value,
  isDirty,
  onChange,
  onLoadDefault,
  onResetToDefault,
}: {
  section: PromptOverrideDisplay[PromptOverrideKey];
  value: string;
  isDirty: boolean;
  onChange: (next: string) => void;
  onLoadDefault: () => void;
  onResetToDefault: () => void;
}) {
  const fieldId = useId();
  const isOverridden = section.value !== null;

  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <legend className="px-1 text-sm font-semibold">{section.label}</legend>
        <div className="flex items-center gap-2 text-xs">
          {isDirty && (
            <span className="font-medium text-amber-700 dark:text-amber-400">Unsaved changes</span>
          )}
          <span className="text-zinc-500 dark:text-zinc-400">
            {isOverridden ? "Overridden" : "Using built-in default"}
          </span>
        </div>
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
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onLoadDefault} className={ACTION_BUTTON_CLASSES}>
          Load built-in prompt to edit
        </button>
        <button
          type="button"
          onClick={onResetToDefault}
          disabled={value === "" && !isOverridden}
          className={ACTION_BUTTON_CLASSES}
        >
          Reset to built-in
        </button>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Blank uses the built-in default -- click &ldquo;Load built-in prompt to edit&rdquo; to start from its
          exact text instead of retyping it.
        </p>
      </div>
    </fieldset>
  );
}

export function AdminPromptsForm({ initialDisplay }: AdminPromptsFormProps) {
  const router = useRouter();
  const [display, setDisplay] = useState(initialDisplay);
  // The last-saved (or initially loaded) value per field, so dirtiness can be
  // judged against what's actually persisted rather than re-derived from
  // `display` on every render.
  const [savedFields, setSavedFields] = useState<FieldValues>(() => fieldsFromDisplay(initialDisplay));
  const [fields, setFields] = useState<FieldValues>(() => fieldsFromDisplay(initialDisplay));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);

  const keys = Object.keys(display) as PromptOverrideKey[];
  const dirtyKeys = keys.filter((key) => fields[key] !== savedFields[key]);
  const hasUnsavedChanges = dirtyKeys.length > 0;

  // Corrections read whatever is already saved, not whatever is sitting
  // unsaved in this form -- an edit here must never feel "already applied"
  // by silently surviving a reload, tab close, or browser-chrome navigation
  // the in-page Save button can't intercept.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
      const nextFields = fieldsFromDisplay(payload);
      setFields(nextFields);
      setSavedFields(nextFields);
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
          isDirty={fields[key] !== savedFields[key]}
          onChange={(next) => setFields((prev) => ({ ...prev, [key]: next }))}
          onLoadDefault={() => setFields((prev) => ({ ...prev, [key]: display[key].defaultValue }))}
          onResetToDefault={() => setFields((prev) => ({ ...prev, [key]: "" }))}
        />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !hasUnsavedChanges}
          className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {isSubmitting ? "Saving…" : "Save settings"}
        </button>
        <p className="sr-only" role="status" aria-live="polite">
          {savedJustNow ? "Settings saved." : ""}
        </p>
        {hasUnsavedChanges && !isSubmitting && (
          <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Unsaved changes -- corrections keep using the previously saved prompt until you save.
          </span>
        )}
        {savedJustNow && !hasUnsavedChanges && !error && (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Saved.</span>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}
