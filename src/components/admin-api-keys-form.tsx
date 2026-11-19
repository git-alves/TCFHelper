"use client";

import { type FormEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AppConfigDisplay,
  AppConfigDisplaySection,
} from "@/lib/app-config";
import type { CorrectionProviderId } from "@/lib/correction-provider";
import type { ExampleProviderId } from "@/lib/example-provider";

type Job = "correction" | "example";
type Provider = CorrectionProviderId & ExampleProviderId;
type Step = {
  id: string;
  provider: Provider;
  model: string;
  apiKey: string;
  savedApiKeyIndex?: number;
  clearSavedKey?: boolean;
  /** A newly added blank step needs an explicit configuration decision. */
  newStepUntouched?: boolean;
};
type Draft = {
  provider: Provider;
  model: string;
  apiKey: string;
  apiKeyCleared: boolean;
  dailyLimit: string;
  chain: Step[] | null;
};
type Outcome = {
  ok: boolean;
  message: string;
  latencyMs: number | null;
  summary: string | null;
};
type Test = { running: boolean; outcome: Outcome | null; requestId?: number };
const providerName: Record<Provider, string> = {
  gemini: "Gemini Direct",
  openrouter: "OpenRouter",
};
const input =
  "mt-1 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm " +
  "focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]";
const button =
  "min-h-11 rounded-lg border border-black/[.15] px-3 py-2 text-sm font-medium " +
  "hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] " +
  "dark:hover:bg-white/[.08]";
let nextChainStepId = 0;

function fromDisplay(display: AppConfigDisplay, job: Job): Draft {
  const section = display[job];
  const provider =
    job === "correction" ? display.correctionProvider : display.exampleProvider;
  const shown =
    job === "correction"
      ? display.correctionModelChain
      : display.exampleModelChain;
  return {
    provider,
    model: section.model ?? "",
    apiKey: "",
    apiKeyCleared: false,
    dailyLimit: section.dailyLimitIsDefault ? "" : String(section.dailyLimit),
    chain:
      shown?.map((step, index) => ({
        id: `saved-${index}`,
        provider: step.provider,
        model: step.model ?? "",
        apiKey: "",
        ...(step.apiKeySet ? { savedApiKeyIndex: index } : {}),
      })) ?? null,
  };
}
function serialize(chain: Step[] | null) {
  return (
    chain?.map((step) => ({
      provider: step.provider,
      model: step.model.trim() || null,
      ...(step.apiKey.trim()
        ? { apiKey: step.apiKey.trim() }
        : step.clearSavedKey
          ? { apiKey: null }
          : {}),
      ...(step.savedApiKeyIndex !== undefined
        ? { savedApiKeyIndex: step.savedApiKeyIndex }
        : {}),
    })) ?? null
  );
}
function source(
  step: Step,
  saved: { apiKeySet: boolean; apiKeyMasked: string | null } | undefined,
  environmentKey: boolean,
) {
  if (step.apiKey.trim()) return "replacement key (unsaved)";
  if (step.savedApiKeyIndex !== undefined && saved?.apiKeySet)
    return `saved key ${saved.apiKeyMasked}`;
  return environmentKey ? "environment key" : "No key — will fail";
}

function hasEnvironmentKey(display: AppConfigDisplay, provider: Provider) {
  return provider === "gemini" ? display.geminiEnvKey : display.openrouterEnvKey;
}
function Result({ test }: { test: Test }) {
  if (!test.outcome) return null;
  const x = test.outcome;
  return (
    <div
      role={x.ok ? "status" : "alert"}
      className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
        x.ok
          ? "border-emerald-500/40 bg-emerald-500/10"
          : "border-red-500/40 bg-red-500/10"
      }`}
    >
      <p>{x.message}</p>
      {x.latencyMs !== null && (
        <p className="mt-1 text-xs">
          Took {x.latencyMs.toLocaleString("en-US")} ms.
        </p>
      )}
      {x.summary && <p className="mt-1 text-xs">{x.summary}</p>}
    </div>
  );
}
function Usage({
  section,
  reserve,
}: {
  section: AppConfigDisplaySection;
  reserve: number;
}) {
  const width = section.dailyLimit
    ? Math.min(
        100,
        Math.round((section.requestsToday / section.dailyLimit) * 100),
      )
    : 0;
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-2">
      <p>
        <strong>Reserve used today:</strong> {reserve || "None today"}
      </p>
      <div>
        <p>
          <strong>Today:</strong>{" "}
          {section.requestsToday.toLocaleString("en-US")} /{" "}
          {section.dailyLimit.toLocaleString("en-US")}
        </p>
        <div
          role="progressbar"
          aria-label="Today’s requests against the daily request limit"
          aria-valuenow={section.requestsToday}
          aria-valuemin={0}
          aria-valuemax={section.dailyLimit}
          className="mt-1 h-2 overflow-hidden rounded-full bg-black/[.08] dark:bg-white/[.12]"
        >
          <div
            className="h-full bg-violet-600"
            style={{ width: `${width}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Failed provider calls count toward this total; requests refused before
          a provider call do not.
        </p>
      </div>
    </div>
  );
}

function JobCard({
  job,
  display,
  draft,
  change,
  alerts,
  reserve,
  getTest,
  runTest,
  changeProvider,
}: {
  job: Job;
  display: AppConfigDisplay;
  draft: Draft;
  change: (d: Draft) => void;
  alerts: {
    id: string;
    section: Job;
    provider: string;
    model: string;
    kind: string;
  }[];
  reserve: number;
  getTest: (stepId: string) => Test;
  runTest: (stepId: string) => void;
  changeProvider: (provider: Provider) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [allEdit, setAllEdit] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const [off, setOff] = useState(false);
  const [legacyEditing, setLegacyEditing] = useState(false);
  const [moveMessage, setMoveMessage] = useState("");
  const section = display[job];
  const title =
    job === "correction" ? "Essay correction" : "Example generation";
  const displayedChain =
    job === "correction"
      ? display.correctionModelChain
      : display.exampleModelChain;
  const jobAlerts = alerts.filter((x) => x.section === job);
  const savedProvider =
    job === "correction" ? display.correctionProvider : display.exampleProvider;
  const providerChanged = draft.provider !== savedProvider;
  const update = (i: number, patch: Partial<Step>) =>
    change({
      ...draft,
      chain: draft.chain!.map((step, n) =>
        n === i
          ? {
              ...step,
              ...patch,
              ...(step.newStepUntouched ? { newStepUntouched: false } : {}),
            }
          : step,
      ),
    });
  const move = (i: number, delta: number) => {
    const to = i + delta;
    if (!draft.chain || to < 0 || to >= draft.chain.length) return;
    const chain = [...draft.chain];
    [chain[i], chain[to]] = [chain[to]!, chain[i]!];
    change({ ...draft, chain });
    setEditing(to);
    setRemove(null);
    setMoveMessage(`Step ${i + 1} moved to position ${to + 1}.`);
  };
  const modelMissing = draft.provider === "openrouter" && !draft.model.trim();
  const chainStatus = draft.chain
    ? `Active model chain · ${draft.chain.length} ${draft.chain.length === 1 ? "step" : "steps"}`
    : displayedChain === null
      ? "Model chain off — using single model"
      : "Single model (legacy)";
  return (
    <section
      aria-labelledby={`${job}-heading`}
      className={
        "rounded-2xl border border-black/[.12] bg-black/[.01] p-4 dark:border-white/[.15] " +
        "dark:bg-white/[.02] sm:p-6"
      }
    >
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 id={`${job}-heading`} className="text-xl font-semibold">
            {title}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {job === "correction"
              ? "Used when grading submitted essays."
              : "Used to generate a model answer for a learner to study."}
          </p>
        </div>
        <p className="rounded-full bg-violet-500/10 px-3 py-1 text-sm font-medium">
          {chainStatus}
        </p>
      </div>
      <div className="mt-4 border-y border-black/[.08] py-3 dark:border-white/[.12]">
        <p className="text-sm">
          {jobAlerts.length
            ? `${jobAlerts.length} current alert${jobAlerts.length === 1 ? "" : "s"}`
            : "No current alerts"}
        </p>
        <Usage section={section} reserve={reserve} />
        {jobAlerts.map((alert) => (
          <p
            key={alert.id}
            role="alert"
            className="mt-2 rounded-lg bg-amber-500/10 p-2 text-sm"
          >
            {alert.provider} / {alert.model}:{" "}
            {alert.kind === "credits" ? "Credits needed." : "Invalid API key."}
          </p>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {moveMessage}
      </p>
      {draft.chain ? (
        <ol className="mt-4 space-y-2" aria-label={`${title} model chain`}>
          {draft.chain.map((step, i) => {
            const role =
              i === 0 ? "Primary" : i === 1 ? "Reserve" : "Final reserve";
            const isEditing = allEdit || editing === i;
            const test = getTest(step.id);
            const stepAlerts = jobAlerts.filter(
              (alert) =>
                alert.provider === step.provider && alert.model === step.model,
            );
            const keySource = source(
              step,
              step.savedApiKeyIndex === undefined
                ? undefined
                : displayedChain?.[step.savedApiKeyIndex],
              hasEnvironmentKey(display, step.provider),
            );
            return (
              <li
                key={step.id}
                className="rounded-xl border border-black/[.1] p-3 dark:border-white/[.15]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <strong>
                      {i + 1} {role}
                    </strong>
                    <span className="ml-3 text-sm">
                      {providerName[step.provider]} ·{" "}
                      {step.model || "default model"}
                    </span>
                    <span
                      className={`ml-3 text-xs ${
                        keySource === "No key — will fail"
                          ? "font-medium text-amber-800 dark:text-amber-300"
                          : "text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      {keySource}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={button}
                      aria-label={`${isEditing ? "Finish editing" : "Edit"} step ${i + 1}`}
                      onClick={() => setEditing(isEditing ? null : i)}
                    >
                      {isEditing ? "Done" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className={button}
                      disabled={test.running}
                      aria-label={`Test step ${i + 1}`}
                      onClick={() => runTest(step.id)}
                    >
                      {test.running ? "Testing…" : "Test"}
                    </button>
                  </div>
                </div>
                {stepAlerts.map((alert) => (
                  <p
                    key={alert.id}
                    role="alert"
                    className="mt-3 rounded-lg bg-amber-500/10 p-2 text-sm"
                  >
                    {alert.kind === "credits"
                      ? "Credits needed for this step."
                      : "Invalid API key for this step."}
                  </p>
                ))}
                {isEditing && (
                  <div className="mt-4 grid gap-3 border-t border-black/[.08] pt-4 dark:border-white/[.12]">
                    <h3 className="font-medium">
                      {title} / Step {i + 1} — {role}
                    </h3>
                    <label className="text-sm font-medium">
                      Provider
                      <select
                        aria-label={`${title} step ${i + 1} provider`}
                        className={input}
                        value={step.provider}
                        onChange={(e) =>
                          update(i, {
                            provider: e.target.value as Provider,
                            savedApiKeyIndex: undefined,
                            clearSavedKey: false,
                          })
                        }
                      >
                        <option value="gemini">Gemini Direct</option>
                        <option value="openrouter">OpenRouter</option>
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Model
                      <input
                        aria-label={`${title} step ${i + 1} model`}
                        className={input}
                        value={step.model}
                        onChange={(e) => update(i, { model: e.target.value })}
                        placeholder={
                          step.provider === "openrouter"
                            ? "vendor/model"
                            : "Default Gemini model"
                        }
                      />
                    </label>
                    <label className="text-sm font-medium">
                      API key
                      <input
                        aria-label={`${title} step ${i + 1} API key`}
                        className={input}
                        type="password"
                        value={step.apiKey}
                        onChange={(e) =>
                          update(i, {
                            apiKey: e.target.value,
                            clearSavedKey: false,
                          })
                        }
                        placeholder="Paste replacement key (leave blank to keep current source)"
                      />
                    </label>
                    {step.savedApiKeyIndex !== undefined && (
                      <button
                        type="button"
                        className="self-start text-sm underline"
                        onClick={() =>
                          update(i, {
                            savedApiKeyIndex: undefined,
                            clearSavedKey: true,
                            apiKey: "",
                          })
                        }
                      >
                        Remove saved key
                      </button>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={button}
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                      >
                        Move earlier
                      </button>
                      <button
                        type="button"
                        className={button}
                        disabled={i === draft.chain!.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        Move later
                      </button>
                      {draft.chain!.length > 1 && (
                        <button
                          type="button"
                          className={button}
                          onClick={() => setRemove(step.id)}
                        >
                          Remove step
                        </button>
                      )}
                    </div>
                    {remove === step.id && (
                      <p
                        role="alert"
                        className="rounded-lg bg-amber-500/10 p-3 text-sm"
                      >
                        Remove this step?{" "}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            change({
                              ...draft,
                              chain: draft.chain!.filter((_, n) => n !== i),
                            });
                            setRemove(null);
                            setEditing(null);
                          }}
                        >
                          Remove
                        </button>{" "}
                        <button
                          type="button"
                          className="underline"
                          onClick={() => setRemove(null)}
                        >
                          Keep it
                        </button>
                      </p>
                    )}
                  </div>
                )}
                <Result test={test} />
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/[.05] p-3 text-sm">
          <strong>
            {modelMissing || (!section.apiKeySet && !section.apiKeyFromEnv)
              ? "Not configured — requests will fail"
              : "Single model (legacy)"}
          </strong>
          <p className="mt-1">
            {providerName[draft.provider]} ·{" "}
            {draft.model ||
              (providerChanged
                ? draft.provider === "gemini"
                  ? "Default Gemini model"
                  : "No model"
                : section.modelDefault || "No model")}{" "}
            ·{" "}
            <span
              className={
                !draft.apiKey.trim() &&
                (providerChanged || !section.apiKeySet) &&
                !hasEnvironmentKey(display, draft.provider)
                  ? "font-medium text-amber-800 dark:text-amber-300"
                  : undefined
              }
            >
              {draft.apiKey.trim()
                ? "replacement key (unsaved)"
                : !providerChanged && section.apiKeySet
                  ? `saved key ${section.apiKeyMasked}`
                  : hasEnvironmentKey(display, draft.provider)
                    ? "environment key"
                    : "No key — will fail"}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              onClick={() => setLegacyEditing(true)}
            >
              Edit single model
            </button>
            <button
              type="button"
              className={button}
              disabled={getTest("legacy").running}
              onClick={() => runTest("legacy")}
            >
              {getTest("legacy").running ? "Testing…" : "Test"}
            </button>
          </div>
          <Result test={getTest("legacy")} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {draft.chain ? (
          <>
            <button
              type="button"
              className={button}
              onClick={() => {
                setAllEdit(!allEdit);
                if (!allEdit) setEditing(0);
              }}
            >
              {allEdit ? "Done editing chain" : "Edit chain"}
            </button>
            {draft.chain.length < 3 && (
              <button
                type="button"
                className={button}
                onClick={() => {
                  change({
                    ...draft,
                    chain: [
                      ...draft.chain!,
                      {
                        id: `new-${++nextChainStepId}`,
                        provider: "gemini",
                        model: "",
                        apiKey: "",
                        newStepUntouched: true,
                      },
                    ],
                  });
                  setEditing(draft.chain!.length);
                }}
              >
                Add reserve step
              </button>
            )}
          </>
        ) : (
          <button
            type="button"
            className={button}
            onClick={() =>
              change({
                ...draft,
                chain: [
                  {
                    id: `new-${++nextChainStepId}`,
                    provider: draft.provider,
                    model: draft.model,
                    apiKey: draft.apiKey,
                    ...(section.apiKeySet ? { savedApiKeyIndex: 0 } : {}),
                  },
                ],
              })
            }
          >
            {displayedChain === null
              ? "Set up a model chain"
              : "Convert to model chain"}
          </button>
        )}
      </div>
      <details
        open={legacyEditing}
        onToggle={(event) =>
          setLegacyEditing((event.target as HTMLDetailsElement).open)
        }
        className="mt-4 rounded-xl border border-black/[.1] p-3 dark:border-white/[.15]"
      >
        <summary className="cursor-pointer font-medium">
          Advanced / legacy settings
        </summary>
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-medium">
            Provider
            <select
              className={input}
              value={draft.provider}
              onChange={(e) => changeProvider(e.target.value as Provider)}
            >
              <option value="gemini">Gemini Direct</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </label>
          {providerChanged && (section.apiKeySet || Boolean(section.model)) && (
            <p
              role="status"
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
            >
              Switching to {providerName[draft.provider]} will remove the saved{" "}
              {providerName[savedProvider]} key and model for this section when
              you save. Enter a new key and model below to keep using this
              section.
            </p>
          )}
          <label className="text-sm font-medium">
            Legacy model
            <input
              className={input}
              value={draft.model}
              onChange={(e) => change({ ...draft, model: e.target.value })}
            />
          </label>
          <label className="text-sm font-medium">
            Legacy API key
            <input
              className={input}
              type="password"
              value={draft.apiKey}
              onChange={(e) =>
                change({
                  ...draft,
                  apiKey: e.target.value,
                  apiKeyCleared: false,
                })
              }
              placeholder="Leave blank to keep current key"
            />
          </label>
          {section.apiKeySet && (
            <label className="text-sm">
              <input
                type="checkbox"
                checked={draft.apiKeyCleared}
                onChange={(e) =>
                  change({
                    ...draft,
                    apiKeyCleared: e.target.checked,
                    apiKey: "",
                  })
                }
              />{" "}
              Use environment default (remove saved key)
            </label>
          )}
          <label className="text-sm font-medium">
            Daily request limit
            <input
              className={input}
              type="number"
              min={1}
              value={draft.dailyLimit}
              onChange={(e) => change({ ...draft, dailyLimit: e.target.value })}
              placeholder={String(section.dailyLimitDefault)}
            />
          </label>
          {draft.chain && (
            <div>
              <button
                type="button"
                className={button}
                onClick={() => setOff(true)}
              >
                Turn off chain
              </button>
              {off && (
                <p
                  role="alert"
                  className="mt-2 rounded-lg bg-amber-500/10 p-3 text-sm"
                >
                  Turning off the chain changes fallback behavior.{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      change({ ...draft, chain: null });
                      setOff(false);
                    }}
                  >
                    Turn off chain
                  </button>{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setOff(false)}
                  >
                    Cancel
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </details>
    </section>
  );
}

export function AdminApiKeysForm({
  initialDisplay,
}: {
  initialDisplay: AppConfigDisplay;
}) {
  const router = useRouter();
  const [display, setDisplay] = useState(initialDisplay);
  const [correction, setCorrection] = useState(() =>
    fromDisplay(initialDisplay, "correction"),
  );
  const [example, setExample] = useState(() =>
    fromDisplay(initialDisplay, "example"),
  );
  const [tests, setTests] = useState<Record<string, Test>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cardStateVersion, setCardStateVersion] = useState(0);
  const testSequence = useRef(0);
  const initial = useMemo(
    () =>
      JSON.stringify({
        correction: fromDisplay(display, "correction"),
        example: fromDisplay(display, "example"),
      }),
    [display],
  );
  const dirty = JSON.stringify({ correction, example }) !== initial;
  const invalid = [correction, example].some(
    (d) =>
      !/^$|^[1-9]\d*$/.test(d.dailyLimit.trim()) ||
      d.chain?.some(
        (s) =>
          (s.provider === "openrouter" && !s.model.trim()) ||
          s.newStepUntouched,
      ),
  );
  const alerts = display.modelChainStatus?.alerts ?? [];
  function change(job: Job, next: Draft) {
    setSaved(false);
    setTests((all) =>
      Object.fromEntries(
        Object.entries(all).filter(([key]) => !key.startsWith(`${job}:`)),
      ),
    );
    if (job === "correction") setCorrection(next);
    else setExample(next);
  }

  function changeProvider(job: Job, provider: Provider) {
    const savedProvider =
      job === "correction"
        ? display.correctionProvider
        : display.exampleProvider;
    const current = job === "correction" ? correction : example;

    if (provider === savedProvider) {
      const saved = fromDisplay(display, job);
      change(job, {
        ...current,
        provider: saved.provider,
        model: saved.model,
        apiKey: saved.apiKey,
        apiKeyCleared: saved.apiKeyCleared,
      });
      return;
    }

    change(job, {
      ...current,
      provider,
      model: "",
      apiKey: "",
      apiKeyCleared: false,
    });
  }
  async function test(job: Job, stepId: string) {
    const draft = job === "correction" ? correction : example;
    const step = draft.chain?.find((candidate) => candidate.id === stepId) ?? {
      id: "legacy",
      provider: draft.provider,
      model: draft.model,
      apiKey: draft.apiKey,
      savedApiKeyIndex: undefined,
    };
    const key = `${job}:${stepId}`;
    const requestId = ++testSequence.current;
    setTests((all) => ({
      ...all,
      [key]: { running: true, outcome: null, requestId },
    }));
    try {
      const response = await fetch("/api/admin/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: job,
          provider: step.provider,
          model: step.model.trim() || null,
          ...(draft.chain
            ? step.apiKey.trim()
              ? { apiKey: step.apiKey.trim() }
              : {}
            : draft.apiKeyCleared
              ? { apiKey: "" }
              : step.apiKey.trim()
                ? { apiKey: step.apiKey.trim() }
                : {}),
          ...(step.savedApiKeyIndex !== undefined
            ? { savedApiKeyIndex: step.savedApiKeyIndex }
            : {}),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        result?: Omit<Outcome, "summary">;
        tested?: { summary?: string };
      } | null;
      const outcome = payload?.result
        ? { ...payload.result, summary: payload.tested?.summary ?? null }
        : {
            ok: false,
            message: payload?.error ?? "Could not run the test.",
            latencyMs: null,
            summary: null,
          };
      setTests((all) =>
        all[key]?.requestId === requestId
          ? { ...all, [key]: { running: false, outcome, requestId } }
          : all,
      );
    } catch {
      setTests((all) =>
        all[key]?.requestId === requestId
          ? {
              ...all,
              [key]: {
                running: false,
                requestId,
                outcome: {
                  ok: false,
                  message: "Could not reach the admin service.",
                  latencyMs: null,
                  summary: null,
                },
              },
            }
          : all,
      );
    }
  }
  async function dismiss(id: string) {
    const response = await fetch(
      `/api/admin/model-chain-alerts/${id}/dismiss`,
      { method: "POST" },
    );
    if (!response.ok) {
      setError("Could not dismiss the alert. Please try again.");
      return;
    }
    setDisplay((d) =>
      d.modelChainStatus
        ? {
            ...d,
            modelChainStatus: {
              ...d.modelChainStatus,
              alerts: d.modelChainStatus.alerts.filter((a) => a.id !== id),
            },
          }
        : d,
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || invalid) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const body = {
      correctionProvider: correction.provider,
      correctionModel: correction.model.trim(),
      correctionDailyLimit: correction.dailyLimit.trim()
        ? Number(correction.dailyLimit)
        : null,
      exampleProvider: example.provider,
      exampleModel: example.model.trim(),
      exampleDailyLimit: example.dailyLimit.trim()
        ? Number(example.dailyLimit)
        : null,
      correctionModelChain: serialize(correction.chain),
      exampleModelChain: serialize(example.chain),
      ...(correction.apiKeyCleared
        ? { correctionApiKey: "" }
        : correction.apiKey.trim()
          ? { correctionApiKey: correction.apiKey.trim() }
          : {}),
      ...(example.apiKeyCleared
        ? { exampleApiKey: "" }
        : example.apiKey.trim()
          ? { exampleApiKey: example.apiKey.trim() }
          : {}),
    };
    try {
      const response = await fetch("/api/admin/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const next = (await response.json().catch(() => null)) as
        | (AppConfigDisplay & { error?: string })
        | null;
      if (!response.ok || !next) {
        setError(next?.error ?? "Could not save settings. Please try again.");
        return;
      }
      setDisplay(next);
      setCorrection(fromDisplay(next, "correction"));
      setExample(fromDisplay(next, "example"));
      setTests({});
      setCardStateVersion((version) => version + 1);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not reach the admin service. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  const changed = [
    JSON.stringify(correction) !==
    JSON.stringify(fromDisplay(display, "correction"))
      ? "Essay correction"
      : null,
    JSON.stringify(example) !== JSON.stringify(fromDisplay(display, "example"))
      ? "Example generation"
      : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {alerts.length > 0 && (
        <section
          aria-label="Attention"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
        >
          <h2 className="font-semibold">Attention</h2>
          {alerts.map((a) => (
            <div
              key={a.id}
              role="alert"
              className="mt-3 flex flex-wrap justify-between gap-2"
            >
              <p>
                <strong>
                  {a.section === "correction"
                    ? "Essay correction"
                    : "Example generation"}{" "}
                  · {a.provider} / {a.model}:
                </strong>{" "}
                {a.kind === "credits"
                  ? "Credits needed. Add credits for this provider step."
                  : "Invalid API key. Edit this step’s key."}
              </p>
              <button
                type="button"
                className="underline"
                onClick={() => void dismiss(a.id)}
              >
                Dismiss
              </button>
            </div>
          ))}
        </section>
      )}
      <JobCard
        job="correction"
        display={display}
        draft={correction}
        change={(d) => change("correction", d)}
        changeProvider={(provider) => changeProvider("correction", provider)}
        alerts={alerts}
        reserve={display.modelChainStatus?.reserveToday.correction ?? 0}
        key={`correction-${cardStateVersion}`}
        getTest={(stepId) =>
          tests[`correction:${stepId}`] ?? {
            running: false,
            outcome: null,
          }
        }
        runTest={(stepId) => void test("correction", stepId)}
      />
      <JobCard
        job="example"
        display={display}
        draft={example}
        change={(d) => change("example", d)}
        changeProvider={(provider) => changeProvider("example", provider)}
        alerts={alerts}
        reserve={display.modelChainStatus?.reserveToday.example ?? 0}
        key={`example-${cardStateVersion}`}
        getTest={(stepId) =>
          tests[`example:${stepId}`] ?? {
            running: false,
            outcome: null,
          }
        }
        runTest={(stepId) => void test("example", stepId)}
      />
      {dirty && (
        <div
          className={
            "sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl " +
            "border border-violet-500/40 bg-background p-4 shadow-lg"
          }
        >
          <p className="text-sm font-medium">Unsaved changes in: {changed}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              onClick={() => {
                setCorrection(fromDisplay(display, "correction"));
                setExample(fromDisplay(display, "example"));
                setTests({});
                setError(null);
                setCardStateVersion((version) => version + 1);
              }}
            >
              Discard changes
            </button>
            <button
              type="submit"
              disabled={saving || invalid}
              className={
                "min-h-11 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white " +
                "disabled:opacity-50"
              }
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
          {invalid && (
            <p role="alert" className="basis-full text-sm text-red-700">
              Enter a model for every chain step and whole-number daily limits
              before saving.
            </p>
          )}
          {error && (
            <p role="alert" className="basis-full text-sm text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
      {saved && (
        <p role="status" className="text-sm text-emerald-700">
          Saved just now.
        </p>
      )}
    </form>
  );
}
