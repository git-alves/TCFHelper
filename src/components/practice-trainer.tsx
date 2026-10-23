"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppCopy } from "@/components/app-locale-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  clearStoredPracticeDraft,
  loadStoredPracticeDraft,
  saveStoredPracticeDraft,
  type StoredSectionReveal,
} from "@/lib/practice-draft-storage";
import {
  PRACTICE_LEVELS,
  PRACTICE_SECTION_BLUEPRINT,
  countWords,
  type PracticeLevel,
  type SectionedPracticeExercise,
} from "@/lib/sectioned-practice";
import { FULL_WALKTHROUGH_PARAM, isFullWalkthrough } from "@/lib/walkthrough";

export type PracticeTask = "TASK_1" | "TASK_2" | "TASK_3";
const TASKS: readonly PracticeTask[] = ["TASK_1", "TASK_2", "TASK_3"];

interface PracticeTrainerProps {
  /** Serializable, reviewed exercises from the server page. */
  exercises: readonly SectionedPracticeExercise[];
}

function ChoiceCard({
  selected,
  onClick,
  children,
  disabled = false,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-violet-600 bg-violet-50 ring-1 ring-violet-600 dark:border-violet-300 dark:bg-violet-950/50 dark:ring-violet-300"
          : "border-black/[.12] bg-white hover:border-violet-400 hover:bg-violet-50/50 dark:border-white/[.18] dark:bg-zinc-950 dark:hover:border-violet-300 dark:hover:bg-violet-950/30"
      }`}
    >
      {children}
    </button>
  );
}

function StepLegend({
  number,
  stepLabel,
  children,
}: {
  number: number;
  stepLabel: (values: { number: number }) => string;
  children: React.ReactNode;
}) {
  return (
    <legend className="flex items-center gap-2 text-base font-semibold text-violet-700 dark:text-violet-300">
      <span
        aria-hidden="true"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white dark:bg-violet-500"
      >
        {number}
      </span>
      <span className="sr-only">{stepLabel({ number })}</span>
      {children}
    </legend>
  );
}

const PRIMARY_BUTTON =
  "rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]";
const SECONDARY_BUTTON =
  "rounded-full border border-black/[.15] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]";

export function PracticeTrainer({ exercises }: PracticeTrainerProps) {
  const appCopy = useAppCopy();
  const practice = appCopy.practice;
  const searchParams = useSearchParams();
  // The comprehensive tour's last Practice step points at the exercise preview,
  // which normally only appears after a manual selection. Seeding Task 1 / B2
  // (the task the Simulate tour also uses) gives that step a real target.
  const isTour = isFullWalkthrough(searchParams?.get(FULL_WALKTHROUGH_PARAM) ?? null);
  const [selectedTask, setSelectedTask] = useState<PracticeTask | null>(isTour ? "TASK_1" : null);
  const [selectedLevel, setSelectedLevel] = useState<PracticeLevel | null>(isTour ? "B2" : null);
  const [active, setActive] = useState<SectionedPracticeExercise | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [reveals, setReveals] = useState<StoredSectionReveal[]>([]);
  const [isConfirmingLeave, setIsConfirmingLeave] = useState(false);
  const progressSessionIdRef = useRef<string | null>(null);
  const completionRecordedRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const selectedExercise =
    selectedTask && selectedLevel
      ? (exercises.find((exercise) => exercise.task === selectedTask && exercise.level === selectedLevel) ?? null)
      : null;

  function open(exercise: SectionedPracticeExercise, saved?: { answers: readonly string[]; reveals: readonly StoredSectionReveal[] }) {
    const sectionCount = PRACTICE_SECTION_BLUEPRINT[exercise.task].length;
    setActive(exercise);
    setSelectedTask(exercise.task);
    setSelectedLevel(exercise.level);
    setAnswers(saved ? [...saved.answers] : Array.from({ length: sectionCount }, () => ""));
    setReveals(saved ? [...saved.reveals] : Array.from({ length: sectionCount }, () => null));
  }

  // Restore an unfinished exercise after a refresh. localStorage only exists
  // in the browser, so this has to run after mount rather than in an initialiser.
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const saved = loadStoredPracticeDraft(window.localStorage);
    const exercise = saved ? exercises.find((candidate) => candidate.id === saved.exerciseId) : null;
    if (!saved || !exercise || saved.answers.length !== PRACTICE_SECTION_BLUEPRINT[exercise.task].length) return;
    progressSessionIdRef.current = saved.progressSessionId ?? null;
    completionRecordedRef.current = saved.completionRecorded ?? false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from browser storage
    open(exercise, saved);
  }, [exercises]);

  useEffect(() => {
    if (!active) return;
    saveStoredPracticeDraft(window.localStorage, {
      version: 1,
      exerciseId: active.id,
      answers,
      reveals,
      progressSessionId: progressSessionIdRef.current ?? undefined,
      completionRecorded: completionRecordedRef.current,
    });
  }, [active, answers, reveals]);

  useEffect(() => {
    if (active) headingRef.current?.focus();
  }, [active]);

  async function recordCompletion(exercise: SectionedPracticeExercise, method: "self-review" | "revealed") {
    try {
      let sessionId = progressSessionIdRef.current;
      if (!sessionId) {
        const response = await fetch("/api/practice/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task: exercise.task, level: exercise.level, exerciseId: exercise.id }),
        });
        if (!response.ok) throw new Error("Session failed");
        const body: unknown = await response.json().catch(() => null);
        sessionId =
          body && typeof body === "object" && "sessionId" in body && typeof body.sessionId === "string"
            ? body.sessionId
            : null;
        if (!sessionId) throw new Error("Session failed");
        progressSessionIdRef.current = sessionId;
      }
      const response = await fetch(`/api/practice/sessions/${encodeURIComponent(sessionId)}/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: exercise.id, completionMethod: method }),
      });
      if (!response.ok) throw new Error("Completion failed");
    } catch {
      // Dashboard activity is best-effort: a failed save must never get in
      // the way of the exercise, but it should be retried on the next reveal.
      completionRecordedRef.current = false;
    }
  }

  function showModelAnswer(index: number) {
    if (!active || reveals[index]) return;
    const nextReveals = [...reveals];
    nextReveals[index] = countWords(answers[index] ?? "") > 0 ? "written" : "empty";
    setReveals(nextReveals);

    if (nextReveals.every((reveal) => reveal !== null) && !completionRecordedRef.current) {
      completionRecordedRef.current = true;
      void recordCompletion(active, nextReveals.every((reveal) => reveal === "written") ? "self-review" : "revealed");
    }
  }

  function resetExercise() {
    if (!active) return;
    progressSessionIdRef.current = null;
    completionRecordedRef.current = false;
    open(active);
  }

  function leaveExercise() {
    clearStoredPracticeDraft(window.localStorage);
    progressSessionIdRef.current = null;
    completionRecordedRef.current = false;
    setIsConfirmingLeave(false);
    setActive(null);
    setAnswers([]);
    setReveals([]);
  }

  function requestLeave() {
    const isComplete = reveals.length > 0 && reveals.every((reveal) => reveal !== null);
    if (!isComplete && answers.some((answer) => answer.trim().length > 0)) setIsConfirmingLeave(true);
    else leaveExercise();
  }

  if (!active) {
    const sections = selectedTask ? PRACTICE_SECTION_BLUEPRINT[selectedTask] : [];
    return (
      <section aria-labelledby="practice-heading" className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header data-walkthrough="practice-intro">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{practice.eyebrow}</p>
          <h1 id="practice-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {practice.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">{practice.description}</p>
        </header>

        <div className="grid gap-6">
          <div data-walkthrough="practice-part-selector" className="grid gap-6">
            <fieldset>
              <StepLegend number={1} stepLabel={appCopy.workspace.stepLabel}>
                {practice.chooseTask}
              </StepLegend>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {TASKS.map((task) => (
                  <ChoiceCard key={task} selected={selectedTask === task} onClick={() => setSelectedTask(task)}>
                    <strong className="block text-base">{practice.tasks[task].title}</strong>
                    <span className="mt-1 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                      {practice.tasks[task].description}
                    </span>
                  </ChoiceCard>
                ))}
              </div>
            </fieldset>

            <fieldset disabled={!selectedTask} aria-describedby={!selectedTask ? "level-help" : undefined}>
              <StepLegend number={2} stepLabel={appCopy.workspace.stepLabel}>
                {practice.chooseLevel}
              </StepLegend>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {PRACTICE_LEVELS.map((level) => (
                  <ChoiceCard
                    key={level}
                    selected={selectedLevel === level}
                    onClick={() => setSelectedLevel(level)}
                    disabled={!selectedTask}
                  >
                    <strong className="block text-base">{level}</strong>
                    <span className="mt-1 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">
                      {practice.levels[level].description}
                    </span>
                  </ChoiceCard>
                ))}
              </div>
              {!selectedTask && (
                <p id="level-help" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {practice.levelHelp}
                </p>
              )}
            </fieldset>
          </div>

          {selectedExercise && selectedTask && selectedLevel && (
            <aside
              data-walkthrough="practice-stages-preview"
              aria-labelledby="practice-preview-heading"
              className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30"
            >
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">{practice.previewEyebrow}</p>
              <h2 id="practice-preview-heading" className="mt-1 text-xl font-semibold">
                {practice.previewTitle({ task: practice.tasks[selectedTask].title, level: selectedLevel })}
              </h2>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{selectedExercise.title}</p>
              <p className="mt-4 text-sm font-semibold">{practice.previewSectionsLabel}</p>
              <ol className="mt-2 grid gap-2 sm:grid-cols-3">
                {sections.map((section, index) => (
                  <li key={section.id} className="rounded-xl bg-white/70 px-3 py-2 text-sm dark:bg-black/15">
                    <span className="mr-2 text-xs font-semibold text-violet-700 dark:text-violet-300">{index + 1}</span>
                    {practice.sections[section.id].label}
                    <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                      {practice.wordRange({ min: section.minWords, max: section.maxWords })}
                    </span>
                  </li>
                ))}
              </ol>
              <button type="button" onClick={() => open(selectedExercise)} className={`mt-5 ${PRIMARY_BUTTON}`}>
                {practice.startExercise}
              </button>
            </aside>
          )}
        </div>
      </section>
    );
  }

  const blueprint = PRACTICE_SECTION_BLUEPRINT[active.task];
  const viewed = reveals.filter((reveal) => reveal !== null).length;
  const isComplete = viewed === blueprint.length;
  const completedIndependently = isComplete && reveals.every((reveal) => reveal === "written");

  return (
    <section aria-labelledby="exercise-heading" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <button
        type="button"
        onClick={requestLeave}
        className="w-fit text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
      >
        {practice.backToChoice}
      </button>

      <header>
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {practice.previewTitle({ task: practice.tasks[active.task].title, level: active.level })}
        </p>
        <h1
          id="exercise-heading"
          ref={headingRef}
          tabIndex={-1}
          className="mt-1 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          {active.title}
        </h1>
      </header>

      <div className="rounded-2xl border border-black/[.1] bg-white p-5 dark:border-white/[.15] dark:bg-zinc-950">
        <p className="text-sm font-semibold">{practice.scenarioLabel}</p>
        <p lang="fr" className="mt-2 text-base leading-7">
          {active.prompt}
        </p>
        {active.requiredElements && (
          <div className="mt-3">
            <p className="text-sm font-semibold">{practice.requiredElementsLabel}</p>
            <ul lang="fr" className="mt-1 list-disc pl-5 text-sm leading-6">
              {active.requiredElements.map((element) => (
                <li key={element}>{element}</li>
              ))}
            </ul>
          </div>
        )}
        {active.documents && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {active.documents.map((document) => (
              <figure key={document.label} className="rounded-xl bg-black/[.03] p-4 dark:bg-white/[.05]">
                <figcaption className="text-sm font-semibold">{document.label}</figcaption>
                <p lang="fr" className="mt-1 text-sm leading-6">
                  {document.text}
                </p>
              </figure>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{practice.examTaskLanguageNote}</p>
      </div>

      <ol className="grid gap-5">
        {blueprint.map((section, index) => {
          const copy = practice.sections[section.id];
          const words = countWords(answers[index] ?? "");
          const inRange = words >= section.minWords && words <= section.maxWords;
          const isRevealed = reveals[index] !== null && reveals[index] !== undefined;
          const textareaId = `section-${section.id}`;
          const counterId = `${textareaId}-count`;

          return (
            <li key={section.id}>
              <section
                aria-labelledby={`${textareaId}-heading`}
                className="rounded-2xl border border-black/[.1] p-5 dark:border-white/[.15]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 id={`${textareaId}-heading`} className="text-lg font-semibold">
                    {practice.sectionHeading({ number: index + 1, label: copy.label })}
                  </h2>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    {practice.wordRange({ min: section.minWords, max: section.maxWords })}
                  </p>
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{copy.guidance}</p>
                {section.example && (
                  <p className="mt-2 text-sm leading-6">
                    <span className="font-semibold">{practice.exampleLabel} : </span>
                    <span lang="fr" className="italic">
                      « {section.example} »
                    </span>
                  </p>
                )}
                {section.connectors && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{practice.connectorsLabel} :</span>
                    {section.connectors.map((connector) => (
                      <span
                        key={connector}
                        lang="fr"
                        className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200"
                      >
                        {connector}
                      </span>
                    ))}
                  </p>
                )}

                <label htmlFor={textareaId} className="sr-only">
                  {practice.draftLabel({ label: copy.label })}
                </label>
                <textarea
                  id={textareaId}
                  lang="fr"
                  value={answers[index] ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAnswers((current) => current.map((answer, i) => (i === index ? value : answer)));
                  }}
                  rows={section.maxWords > 40 ? 6 : 3}
                  placeholder={practice.draftPlaceholder}
                  aria-describedby={counterId}
                  className="mt-3 w-full resize-y rounded-xl border border-black/[.15] bg-white px-4 py-3 text-base leading-7 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200 dark:border-white/[.2] dark:bg-zinc-950 dark:focus:border-violet-300 dark:focus:ring-violet-950"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <p
                    id={counterId}
                    className={`text-sm ${
                      inRange ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {practice.wordCounter({ words, min: section.minWords, max: section.maxWords })}
                  </p>
                  {!isRevealed && (
                    <button type="button" onClick={() => showModelAnswer(index)} className={SECONDARY_BUTTON}>
                      {practice.showModelAnswer}
                    </button>
                  )}
                </div>

                {isRevealed && (
                  <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                      {practice.modelAnswerLabel}
                    </p>
                    <p lang="fr" className="mt-1 text-base leading-7">
                      {active.modelAnswers[index]}
                    </p>
                  </div>
                )}
              </section>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-1">
        <p role="status" aria-live="polite" className="text-sm font-medium">
          {practice.progress({ viewed, total: blueprint.length })}
        </p>
        {viewed > 0 && !isComplete && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{practice.compareHint}</p>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{practice.draftSavedNotice}</p>
      </div>

      {isComplete && (
        <aside
          aria-labelledby="practice-complete-heading"
          className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30"
        >
          <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">{practice.completedEyebrow}</p>
          <h2 id="practice-complete-heading" className="mt-1 text-xl font-semibold">
            {practice.completedTitle}
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {completedIndependently ? practice.completedDescription : practice.completedWithHelpDescription}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={resetExercise} className={PRIMARY_BUTTON}>
              {practice.practiceAgain}
            </button>
            <button type="button" onClick={leaveExercise} className={SECONDARY_BUTTON}>
              {practice.chooseAnother}
            </button>
            <Link href="/tasks" className={SECONDARY_BUTTON}>
              {practice.tryFullTask}
            </Link>
          </div>
        </aside>
      )}

      <ConfirmDialog
        open={isConfirmingLeave}
        title={practice.leaveTitle}
        description={practice.leaveDescription}
        confirmLabel={practice.leaveConfirm}
        cancelLabel={practice.leaveKeep}
        onConfirm={leaveExercise}
        onCancel={() => setIsConfirmingLeave(false)}
      />
    </section>
  );
}
