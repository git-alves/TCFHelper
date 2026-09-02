"use client";

import { type FormEvent, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppConfigDisplay, AppConfigDisplaySection } from "@/lib/app-config";

interface AdminAiSettingsFormProps {
  initialDisplay: AppConfigDisplay;
}

interface SectionFormState {
  apiKeyInput: string;
  apiKeyCleared: boolean;
  model: string;
}

function sectionStateFromDisplay(section: AppConfigDisplaySection): SectionFormState {
  return { apiKeyInput: "", apiKeyCleared: false, model: section.model ?? "" };
}

const INPUT_CLASSES =
  "mt-2 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2]";

function apiKeyStatusLabel(section: AppConfigDisplaySection) {
  if (section.apiKeySet) return `Currently set here: ${section.apiKeyMasked}`;
  if (section.apiKeyFromEnv) return "Currently using the GEMINI_API_KEY environment variable.";
  return "Not configured -- requests will fail until a key is set here or via GEMINI_API_KEY.";
}

function AiSettingsSection({
  title,
  description,
  section,
  state,
  onChange,
}: {
  title: string;
  description: string;
  section: AppConfigDisplaySection;
  state: SectionFormState;
  onChange: (next: SectionFormState) => void;
}) {
  const apiKeyId = useId();
  const modelId = useId();

  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <p className="-mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>

      <div>
        <label htmlFor={apiKeyId} className="block text-sm font-medium">
          API key
        </label>
        <input
          id={apiKeyId}
          type="password"
          autoComplete="off"
          value={state.apiKeyInput}
          disabled={state.apiKeyCleared}
          onChange={(event) => onChange({ ...state, apiKeyInput: event.target.value })}
          placeholder="Leave blank to keep the current key"
          className={INPUT_CLASSES}
        />
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{apiKeyStatusLabel(section)}</p>
        {section.apiKeySet && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.apiKeyCleared}
              onChange={(event) =>
                onChange({ ...state, apiKeyCleared: event.target.checked, apiKeyInput: "" })
              }
            />
            Clear stored key on save (revert to GEMINI_API_KEY)
          </label>
        )}
      </div>

      <div>
        <label htmlFor={modelId} className="block text-sm font-medium">
          Model
        </label>
        <input
          id={modelId}
          type="text"
          value={state.model}
          onChange={(event) => onChange({ ...state, model: event.target.value })}
          placeholder={section.modelDefault}
          className={INPUT_CLASSES}
        />
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">Default if left blank: {section.modelDefault}</p>
      </div>
    </fieldset>
  );
}

export function AdminAiSettingsForm({ initialDisplay }: AdminAiSettingsFormProps) {
  const router = useRouter();
  const [display, setDisplay] = useState(initialDisplay);
  const [correction, setCorrection] = useState<SectionFormState>(() => sectionStateFromDisplay(initialDisplay.correction));
  const [example, setExample] = useState<SectionFormState>(() => sectionStateFromDisplay(initialDisplay.example));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSavedJustNow(false);
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = {
        correctionModel: correction.model.trim(),
        exampleModel: example.model.trim(),
      };
      if (correction.apiKeyCleared) body.correctionApiKey = "";
      else if (correction.apiKeyInput.trim()) body.correctionApiKey = correction.apiKeyInput.trim();
      if (example.apiKeyCleared) body.exampleApiKey = "";
      else if (example.apiKeyInput.trim()) body.exampleApiKey = example.apiKeyInput.trim();

      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as (AppConfigDisplay & { error?: string }) | null;

      if (!response.ok || !payload) {
        setError(payload?.error ?? "Could not save settings. Please try again.");
        return;
      }

      setDisplay(payload);
      setCorrection(sectionStateFromDisplay(payload.correction));
      setExample(sectionStateFromDisplay(payload.example));
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
      <AiSettingsSection
        title="Essay correction"
        description="Used when grading a submitted essay."
        section={display.correction}
        state={correction}
        onChange={setCorrection}
      />
      <AiSettingsSection
        title="Example generation"
        description="Used when generating a model answer for a learner to study."
        section={display.example}
        state={example}
        onChange={setExample}
      />

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
