"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminQuotaOverride } from "@/lib/admin-users";
import type { UserQuotaLimits } from "@/lib/user-quota-limits";

type QuotaField = keyof UserQuotaLimits;

const QUOTA_FIELDS: Array<{
  name: QuotaField;
  label: string;
  description: string;
}> = [
  {
    name: "translationRequestsPerMinute",
    label: "Translation requests per minute",
    description: "Limits how many translation requests can start in one UTC minute.",
  },
  {
    name: "translationCharactersPerMinute",
    label: "Translation characters per minute",
    description: "Counts Unicode characters across translation requests in one UTC minute.",
  },
  {
    name: "translationCharactersPerMonth",
    label: "Translation characters per month",
    description: "Counts Unicode characters across translation requests in the current UTC month.",
  },
  {
    name: "exampleGenerationsPerDay",
    label: "Example generations per day",
    description: "Limits fresh model-generated examples in one UTC day; cached examples remain available.",
  },
  {
    name: "correctionRequestsPerDay",
    label: "Corrections per day",
    description: "Limits fresh essay corrections in one UTC day.",
  },
];

interface AdminQuotaOverrideFormProps {
  userId: string;
  email: string;
  overrides: AdminQuotaOverride;
  globalDefaults: UserQuotaLimits;
}

function formValues(overrides: AdminQuotaOverride): Record<QuotaField, string> {
  return Object.fromEntries(
    QUOTA_FIELDS.map(({ name }) => [name, overrides[name] === null ? "" : String(overrides[name])]),
  ) as Record<QuotaField, string>;
}

function parseValues(values: Record<QuotaField, string>): AdminQuotaOverride | null {
  const parsed = {} as AdminQuotaOverride;
  for (const { name } of QUOTA_FIELDS) {
    const value = values[name].trim();
    if (!value) {
      parsed[name] = null;
      continue;
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0 || number > 1_000_000_000) return null;
    parsed[name] = number;
  }
  return parsed;
}

function valuesMatch(left: Record<QuotaField, string>, right: Record<QuotaField, string>) {
  return QUOTA_FIELDS.every(({ name }) => left[name].trim() === right[name].trim());
}

/**
 * Blank fields intentionally mean "inherit the global setting", rather than
 * forcing an owner to know or re-enter every default while changing one cap.
 */
export function AdminQuotaOverrideForm({
  userId,
  email,
  overrides: initialOverrides,
  globalDefaults,
}: AdminQuotaOverrideFormProps) {
  const router = useRouter();
  const initialValues = useMemo(() => formValues(initialOverrides), [initialOverrides]);
  const [values, setValues] = useState(initialValues);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const parsedValues = parseValues(values);
  const isChanged = !valuesMatch(values, savedValues);

  function updateField(name: QuotaField, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    if (status) setStatus("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving || !parsedValues) return;

    setIsSaving(true);
    setStatus("Saving quota limits…");
    try {
      const response = await fetch(`/api/admin/users/${userId}/quota-overrides`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedValues),
      });
      const body = (await response.json().catch(() => null)) as
        | { error?: string; quotaOverride?: AdminQuotaOverride }
        | null;
      if (!response.ok || !body?.quotaOverride) {
        setStatus(body?.error ?? "Could not save quota limits. Please try again.");
        return;
      }

      const nextValues = formValues(body.quotaOverride);
      setValues(nextValues);
      setSavedValues(nextValues);
      setStatus(`Quota limits saved for ${email}.`);
      router.refresh();
    } catch {
      setStatus("Could not save quota limits. Check your connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-black/[.1] p-4 sm:p-5 dark:border-white/[.15]" aria-labelledby="quota-overrides-heading">
      <div className="max-w-2xl">
        <h2 id="quota-overrides-heading" className="text-base font-semibold">Quota overrides</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Leave a field blank to use the global default. Enter <strong>0</strong> to pause only that API for this learner.
        </p>
      </div>

      <form className="mt-5 grid gap-5" onSubmit={handleSubmit} noValidate>
        <div className="grid gap-4 lg:grid-cols-2">
          {QUOTA_FIELDS.map(({ name, label, description }) => {
            const inputId = `quota-${name}`;
            return (
              <div key={name} className="rounded-lg bg-black/[.025] p-3.5 dark:bg-white/[.04]">
                <label htmlFor={inputId} className="block text-sm font-medium">{label}</label>
                <p id={`${inputId}-description`} className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                  {description} Global default: {globalDefaults[name].toLocaleString("en-US")}.
                </p>
                <input
                  id={inputId}
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  inputMode="numeric"
                  value={values[name]}
                  onChange={(event) => updateField(name, event.target.value)}
                  placeholder={`Global: ${globalDefaults[name].toLocaleString("en-US")}`}
                  aria-describedby={`${inputId}-description`}
                  className="mt-3 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
                />
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!isChanged || !parsedValues || isSaving}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            {isSaving ? "Saving limits…" : "Save limits"}
          </button>
          {!parsedValues && (
            <p className="text-sm text-red-700 dark:text-red-300">Use whole numbers from 0 to 1,000,000,000, or leave the field blank.</p>
          )}
          <p className="sr-only" role="status" aria-live="polite">{status}</p>
          {status && !isSaving && <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p>}
        </div>
      </form>
    </section>
  );
}
