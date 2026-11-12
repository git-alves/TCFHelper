"use client";

import { type FormEvent, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppConfigDisplay, AppConfigDisplaySection } from "@/lib/app-config";
import { CORRECTION_PROVIDER_IDS, type CorrectionProviderId } from "@/lib/correction-provider";
import { type ExampleProviderId } from "@/lib/example-provider";

interface AdminApiKeysFormProps {
  initialDisplay: AppConfigDisplay;
}

type TestSection = "correction" | "example";

interface TestOutcome {
  ok: boolean;
  message: string;
  latencyMs: number | null;
  /** What was tested, in a sentence (which key and model were used). */
  summary: string | null;
}

type TestState = { status: "idle" } | { status: "running" } | { status: "done"; outcome: TestOutcome };

interface SectionFormState {
  apiKeyInput: string;
  apiKeyCleared: boolean;
  model: string;
  dailyLimitInput: string;
}

// CorrectionProviderId and ExampleProviderId are the same "gemini" |
// "openrouter" domain today (see correction-provider.ts / example-provider.ts);
// the UI shares one dropdown implementation over that domain rather than
// duplicating it per feature.
type ProviderId = CorrectionProviderId & ExampleProviderId;

const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: "Gemini Direct",
  openrouter: "OpenRouter",
};

function sectionStateFromDisplay(section: AppConfigDisplaySection): SectionFormState {
  return {
    apiKeyInput: "",
    apiKeyCleared: false,
    model: section.model ?? "",
    // Blank when it's still the built-in default, so the placeholder (not a
    // number the admin never actually chose) is what shows.
    dailyLimitInput: section.dailyLimitIsDefault ? "" : String(section.dailyLimit),
  };
}

/** null means "leave the built-in default", undefined means "invalid input". */
function parseDailyLimitInput(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

const INPUT_CLASSES =
  "mt-2 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2]";

function apiKeyStatusLabel(section: AppConfigDisplaySection, apiKeyEnvVarName: string, providerChanged: boolean) {
  // The saved key belongs to the provider it was saved for; saving a different
  // provider removes it, so do not present it as this provider's key.
  if (providerChanged) {
    return `No key is saved for this provider yet. Paste one below, or set ${apiKeyEnvVarName}.`;
  }
  if (section.apiKeySet) return `Currently set here: ${section.apiKeyMasked} (takes precedence over ${apiKeyEnvVarName})`;
  if (section.apiKeyFromEnv) return `Currently using the ${apiKeyEnvVarName} environment variable.`;
  return `Not configured -- requests will fail until a key is set here or via ${apiKeyEnvVarName}.`;
}

function ConsumptionBar({ section }: { section: AppConfigDisplaySection }) {
  const ratio = section.dailyLimit > 0 ? section.requestsToday / section.dailyLimit : 0;
  const widthPercent = Math.min(100, Math.round(ratio * 100));
  const barColor = ratio >= 1 ? "bg-red-600" : ratio >= 0.8 ? "bg-amber-500" : "bg-violet-600";

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Today&apos;s requests</span>
        <span className="text-zinc-600 dark:text-zinc-400">
          {section.requestsToday.toLocaleString("en-US")} / {section.dailyLimit.toLocaleString("en-US")}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={section.requestsToday}
        aria-valuemin={0}
        aria-valuemax={section.dailyLimit}
        className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-black/[.08] dark:bg-white/[.12]"
      >
        <div className={`h-full rounded-full transition-[width] ${barColor}`} style={{ width: `${widthPercent}%` }} />
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Self-tracked from this app&apos;s own request log, not reported by Google. Counts every call made to the provider today, including ones that failed (they can still cost tokens); requests refused before the provider was called are not counted. Resets at midnight UTC.
      </p>
    </div>
  );
}

function AiSettingsSection({
  title,
  description,
  section,
  state,
  onChange,
  apiKeyEnvVarName,
  provider,
  savedProvider,
  testState,
  onTest,
}: {
  title: string;
  description: string;
  section: AppConfigDisplaySection;
  state: SectionFormState;
  onChange: (next: SectionFormState) => void;
  apiKeyEnvVarName: string;
  provider: { value: ProviderId; onChange: (next: ProviderId) => void };
  /** The provider currently saved for this section (what a different choice would replace). */
  savedProvider: ProviderId;
  testState: TestState;
  onTest: () => void;
}) {
  const apiKeyId = useId();
  const providerId = useId();
  const modelId = useId();
  const dailyLimitId = useId();
  const dailyLimitIsInvalid = parseDailyLimitInput(state.dailyLimitInput) === undefined;
  const providerChanged = provider.value !== savedProvider;
  // The defaults on `section` belong to the saved provider; after an unsaved
  // provider change they would describe the wrong one.
  const hasModelDefault = !providerChanged && section.modelDefault.trim() !== "";
  const willRemoveSaved = providerChanged && (section.apiKeySet || Boolean(section.model));

  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      <p className="-mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>

      <ConsumptionBar section={section} />

      <div>
        <label htmlFor={providerId} className="block text-sm font-medium">
          AI Provider
        </label>
        <select
          id={providerId}
          value={provider.value}
          onChange={(event) => provider.onChange(event.target.value as ProviderId)}
          className={INPUT_CLASSES}
        >
          {CORRECTION_PROVIDER_IDS.map((id) => (
            <option key={id} value={id}>
              {PROVIDER_LABELS[id]}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Which backend to use. The API key and model below apply to whichever provider is selected here.
        </p>
        {willRemoveSaved && (
          <p role="status" className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
            Switching to {PROVIDER_LABELS[provider.value]} will remove the saved {PROVIDER_LABELS[savedProvider]} key and model for this
            section when you save. Enter a new key and model below to keep using this section.
          </p>
        )}
      </div>

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
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {apiKeyStatusLabel(section, apiKeyEnvVarName, providerChanged)}
        </p>
        {section.apiKeySet && !providerChanged && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.apiKeyCleared}
              onChange={(event) =>
                onChange({ ...state, apiKeyCleared: event.target.checked, apiKeyInput: "" })
              }
            />
            Clear stored key on save (revert to {apiKeyEnvVarName})
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
          placeholder={hasModelDefault ? section.modelDefault : provider.value === "openrouter" ? "e.g. qwen/qwen3-30b-a3b" : "e.g. gemini-3.5-flash-lite"}
          autoComplete="off"
          spellCheck={false}
          className={INPUT_CLASSES}
        />
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          {provider.value === "openrouter"
            ? "Format: vendor/model, optionally :variant (for example qwen/qwen3-30b-a3b or meta-llama/llama-3.3-70b-instruct:free)."
            : "Format: a single name with no slash (for example gemini-3.5-flash-lite)."}{" "}
          {hasModelDefault
            ? `Default if left blank: ${section.modelDefault}`
            : provider.value === "openrouter"
              ? "Required -- this provider has no built-in default model."
              : "Leave blank to use Gemini's default model."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTest}
            disabled={testState.status === "running"}
            className="rounded-full border border-black/[.15] px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/[.2] dark:hover:bg-white/[.08]"
          >
            {testState.status === "running" ? "Testing…" : "Test"}
          </button>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Makes one small real call with the values above, saved or not.
          </p>
        </div>
        {testState.status === "done" && (
          <div
            role={testState.outcome.ok ? "status" : "alert"}
            data-testid="api-key-test-result"
            className={`rounded-lg border px-3 py-2 text-sm ${
              testState.outcome.ok
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                : "border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-200"
            }`}
          >
            <p>{testState.outcome.message}</p>
            {testState.outcome.latencyMs !== null && (
              <p className="mt-1 text-xs opacity-80">Took {testState.outcome.latencyMs.toLocaleString("en-US")} ms.</p>
            )}
            {testState.outcome.summary && <p className="mt-1 text-xs opacity-80">{testState.outcome.summary}</p>}
          </div>
        )}
      </div>

      <div>
        <label htmlFor={dailyLimitId} className="block text-sm font-medium">
          Daily request limit
        </label>
        <input
          id={dailyLimitId}
          type="number"
          inputMode="numeric"
          min={1}
          value={state.dailyLimitInput}
          onChange={(event) => onChange({ ...state, dailyLimitInput: event.target.value })}
          placeholder={String(section.dailyLimitDefault)}
          aria-invalid={dailyLimitIsInvalid}
          className={INPUT_CLASSES}
        />
        <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Only affects the bar above. Leave blank to use the built-in default of {section.dailyLimitDefault}.
        </p>
        {dailyLimitIsInvalid && (
          <p className="mt-1 text-xs text-red-700 dark:text-red-300">Enter a whole number greater than 0.</p>
        )}
      </div>
    </fieldset>
  );
}

export function AdminApiKeysForm({ initialDisplay }: AdminApiKeysFormProps) {
  const router = useRouter();
  const [display, setDisplay] = useState(initialDisplay);
  const [correctionProvider, setCorrectionProvider] = useState<CorrectionProviderId>(
    initialDisplay.correctionProvider,
  );
  const [exampleProvider, setExampleProvider] = useState<ExampleProviderId>(initialDisplay.exampleProvider);
  const [correction, setCorrection] = useState<SectionFormState>(() => sectionStateFromDisplay(initialDisplay.correction));
  const [example, setExample] = useState<SectionFormState>(() => sectionStateFromDisplay(initialDisplay.example));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [correctionTest, setCorrectionTest] = useState<TestState>({ status: "idle" });
  const [exampleTest, setExampleTest] = useState<TestState>({ status: "idle" });
  const correctionApiKeyEnvVarName = correctionProvider === "openrouter" ? "OPENROUTER_API_KEY" : "GEMINI_API_KEY";
  const exampleApiKeyEnvVarName = exampleProvider === "openrouter" ? "OPENROUTER_API_KEY" : "GEMINI_API_KEY";

  const correctionDailyLimit = useMemo(() => parseDailyLimitInput(correction.dailyLimitInput), [correction.dailyLimitInput]);
  const exampleDailyLimit = useMemo(() => parseDailyLimitInput(example.dailyLimitInput), [example.dailyLimitInput]);
  const canSubmit = !isSubmitting && correctionDailyLimit !== undefined && exampleDailyLimit !== undefined;

  // A test result describes the values that were in the form when it ran, so
  // any later edit to the section clears it rather than leave a stale answer.
  function changeSection(section: TestSection, next: SectionFormState) {
    if (section === "correction") {
      setCorrection(next);
      setCorrectionTest({ status: "idle" });
    } else {
      setExample(next);
      setExampleTest({ status: "idle" });
    }
  }

  // Choosing a different provider than the saved one starts that section
  // afresh (the saved key and model belong to the saved provider, and saving
  // removes them): the key and model inputs are emptied. Choosing the saved
  // provider again puts the saved values back.
  function changeProvider(section: TestSection, next: ProviderId) {
    const savedProvider = section === "correction" ? display.correctionProvider : display.exampleProvider;
    const savedSection = section === "correction" ? display.correction : display.example;
    const current = section === "correction" ? correction : example;
    if (section === "correction") setCorrectionProvider(next);
    else setExampleProvider(next);
    changeSection(
      section,
      next === savedProvider
        ? sectionStateFromDisplay(savedSection)
        : { apiKeyInput: "", apiKeyCleared: false, model: "", dailyLimitInput: current.dailyLimitInput },
    );
  }

  // What the Test button sends is what saving would send for this section: the
  // selected provider, a key only if one was typed (or cleared), and the model
  // exactly as shown, where blank means "use the default".
  async function runTest(section: TestSection) {
    const state = section === "correction" ? correction : example;
    const provider = section === "correction" ? correctionProvider : exampleProvider;
    const setTest = section === "correction" ? setCorrectionTest : setExampleTest;
    const body: Record<string, string> = { section, provider, model: state.model.trim() };
    if (state.apiKeyCleared) body.apiKey = "";
    else if (state.apiKeyInput.trim()) body.apiKey = state.apiKeyInput.trim();

    setTest({ status: "running" });
    try {
      const response = await fetch("/api/admin/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; result?: { ok: boolean; message: string; latencyMs: number | null }; tested?: { summary?: string } }
        | null;
      if (!response.ok || !payload?.result) {
        setTest({
          status: "done",
          outcome: { ok: false, message: payload?.error ?? "Could not run the test. Please try again.", latencyMs: null, summary: null },
        });
        return;
      }
      setTest({
        status: "done",
        outcome: {
          ok: payload.result.ok,
          message: payload.result.message,
          latencyMs: payload.result.latencyMs,
          summary: payload.tested?.summary ?? null,
        },
      });
    } catch {
      setTest({
        status: "done",
        outcome: { ok: false, message: "Could not reach the admin service. Please try again.", latencyMs: null, summary: null },
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSavedJustNow(false);
    setIsSubmitting(true);
    try {
      const body: Record<string, string | number | null> = {
        correctionProvider,
        correctionModel: correction.model.trim(),
        correctionDailyLimit,
        exampleProvider,
        exampleModel: example.model.trim(),
        exampleDailyLimit,
      };
      if (correction.apiKeyCleared) body.correctionApiKey = "";
      else if (correction.apiKeyInput.trim()) body.correctionApiKey = correction.apiKeyInput.trim();
      if (example.apiKeyCleared) body.exampleApiKey = "";
      else if (example.apiKeyInput.trim()) body.exampleApiKey = example.apiKeyInput.trim();

      const response = await fetch("/api/admin/api-keys", {
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
      setCorrectionProvider(payload.correctionProvider);
      setExampleProvider(payload.exampleProvider);
      setCorrection(sectionStateFromDisplay(payload.correction));
      setExample(sectionStateFromDisplay(payload.example));
      setCorrectionTest({ status: "idle" });
      setExampleTest({ status: "idle" });
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
        onChange={(next) => changeSection("correction", next)}
        apiKeyEnvVarName={correctionApiKeyEnvVarName}
        provider={{ value: correctionProvider, onChange: (next) => changeProvider("correction", next) }}
        savedProvider={display.correctionProvider}
        testState={correctionTest}
        onTest={() => void runTest("correction")}
      />
      <AiSettingsSection
        title="Example generation"
        description="Used when generating a model answer for a learner to study."
        section={display.example}
        state={example}
        onChange={(next) => changeSection("example", next)}
        apiKeyEnvVarName={exampleApiKeyEnvVarName}
        provider={{ value: exampleProvider, onChange: (next) => changeProvider("example", next) }}
        savedProvider={display.exampleProvider}
        testState={exampleTest}
        onTest={() => void runTest("example")}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
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
