"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppCopy } from "@/components/app-locale-provider";
import { ThemedSelect, type ThemedSelectOption } from "@/components/themed-select";
import type { AppCopy } from "@/lib/app-copy";
import { selectPracticeExerciseSession } from "@/lib/practice-exercise-order";
import {
  clearStoredPracticeSession,
  loadStoredPracticeSession,
  saveStoredPracticeSession,
  type StoredPracticeSession,
} from "@/lib/practice-session-storage";

export type PracticeTask = "TASK_1" | "TASK_2" | "TASK_3";
export type PracticeLevel = "B2" | "C1" | "C2";
export type PracticeExerciseType = "recognize" | "complete" | "transform" | "organize" | "develop" | "produce";

// This is intentionally a content-shaped contract, rather than a UI-shaped
// one. Exercises are reviewed teaching material in the question bank; this
// component only renders and evaluates the fixed data it receives.
export interface CuratedPracticeSkill {
  id: string;
  task: PracticeTask;
  level: PracticeLevel;
  /** Stable position of this part within the selected TCF task. */
  part_order: number;
  /** Whether this level has a complete fixed, reviewed six-stage path. */
  is_available: boolean;
  label: string;
  description: string;
  learning_outcome: string;
  estimated_minutes: number;
}

export interface CuratedPracticeExercise {
  id: string;
  task: PracticeTask;
  level: PracticeLevel;
  skill: string;
  sub_skill: string;
  exercise_type: PracticeExerciseType;
  prompt: string;
  instructions: string;
  options?: readonly string[];
  correct_answer?: string | readonly string[];
  accepted_answers?: readonly string[];
  explanation: string;
  target_language_feature: string;
  difficulty: number;
  sequence_order: number;
  prerequisite_exercise?: string;
  tags: readonly string[];
  self_check?: readonly string[];
}

export interface CuratedPracticeCurriculum {
  skills: readonly CuratedPracticeSkill[];
  exercises: readonly CuratedPracticeExercise[];
}

interface PracticeTrainerProps {
  curriculum: CuratedPracticeCurriculum;
}

const TASKS: readonly PracticeTask[] = ["TASK_1", "TASK_2", "TASK_3"];
const LEVELS: readonly PracticeLevel[] = ["B2", "C1", "C2"];
const EXERCISE_STAGES: readonly PracticeExerciseType[] = [
  "recognize",
  "complete",
  "transform",
  "organize",
  "develop",
  "produce",
];

type CheckState = "correct" | "try-again" | "revealed" | "self-review" | null;
type CompletionMethod = "correct" | "revealed" | "self-review";
type DifficultyRating = "too-easy" | "appropriate" | "too-hard";

const DIFFICULTY_RATINGS: readonly DifficultyRating[] = ["too-easy", "appropriate", "too-hard"];

const SELECT_BUTTON_CLASS =
  "flex w-full items-center justify-between gap-3 rounded-xl border border-black/[.15] bg-white px-4 py-3 text-left text-sm shadow-sm outline-none transition-colors focus:border-violet-600 focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.2] dark:bg-zinc-950 dark:focus:border-violet-300 dark:focus:ring-violet-950";
const SELECT_LIST_CLASS =
  "absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-black/[.15] bg-white p-1 shadow-lg dark:border-white/[.2] dark:bg-zinc-950";

function normalizeAnswer(answer: string): string {
  return answer
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
}

function matchesAnswer(answer: string, exercise: CuratedPracticeExercise): boolean {
  const expected = [
    ...(typeof exercise.correct_answer === "string" ? [exercise.correct_answer] : []),
    ...(exercise.accepted_answers ?? []),
  ].map(normalizeAnswer);
  return expected.includes(normalizeAnswer(answer));
}

function isOrderedCorrect(order: readonly string[], exercise: CuratedPracticeExercise): boolean {
  return (
    Array.isArray(exercise.correct_answer) &&
    order.length === exercise.correct_answer.length &&
    order.every((item, index) => item === exercise.correct_answer?.[index])
  );
}

function getReviewedAnswers(exercise: CuratedPracticeExercise | null): readonly string[] {
  if (!exercise) return [];
  if (typeof exercise.correct_answer === "string") return [exercise.correct_answer];
  if (Array.isArray(exercise.correct_answer)) return exercise.correct_answer;
  return exercise.accepted_answers ?? [];
}

function getExercisesForSkill(
  curriculum: CuratedPracticeCurriculum,
  skill: CuratedPracticeSkill,
): CuratedPracticeExercise[] {
  return curriculum.exercises.filter(
    (exercise) => exercise.task === skill.task && exercise.level === skill.level && exercise.skill === skill.id,
  );
}

function resolveStoredSession(
  curriculum: CuratedPracticeCurriculum,
  session: StoredPracticeSession,
): { skill: CuratedPracticeSkill; exercises: readonly CuratedPracticeExercise[] } | null {
  const skill = curriculum.skills.find(
    (candidate) => candidate.task === session.task && candidate.level === session.level && candidate.id === session.skillId,
  );
  if (!skill) return null;

  const exerciseById = new Map(getExercisesForSkill(curriculum, skill).map((exercise) => [exercise.id, exercise]));
  const savedExercises = session.exerciseIds.map((id) => exerciseById.get(id));
  if (
    savedExercises.length !== EXERCISE_STAGES.length ||
    savedExercises.some((exercise) => !exercise) ||
    new Set(session.exerciseIds).size !== session.exerciseIds.length ||
    session.currentExerciseIndex >= savedExercises.length ||
    savedExercises.some((exercise, index) => exercise?.exercise_type !== EXERCISE_STAGES[index])
  ) {
    return null;
  }

  return { skill, exercises: savedExercises as CuratedPracticeExercise[] };
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
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

function ProgressSteps({
  exercises,
  currentIndex,
  completionMethods,
  practice,
}: {
  exercises: readonly CuratedPracticeExercise[];
  currentIndex: number;
  completionMethods: ReadonlyMap<string, CompletionMethod>;
  practice: AppCopy["practice"];
}) {
  return (
    <ol aria-label={practice.progress({ step: currentIndex + 1, total: exercises.length })} className="grid grid-cols-6 gap-1 sm:gap-2">
      {exercises.map((exercise, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "future";
        // A stage finished by revealing the answer stays visibly distinct
        // from one the learner actually solved, so progress signals honest
        // mastery rather than mere completion.
        const doneWithHelp = state === "done" && completionMethods.get(exercise.id) === "revealed";
        return (
          <li key={exercise.id} className="min-w-0">
            <div
              aria-current={state === "current" ? "step" : undefined}
              title={doneWithHelp ? practice.completedWithHelpLabel : undefined}
              className={`h-1.5 rounded-full ${
                doneWithHelp
                  ? "bg-amber-500 dark:bg-amber-400"
                  : state === "done"
                    ? "bg-violet-600 dark:bg-violet-300"
                    : state === "current"
                      ? "bg-violet-400 dark:bg-violet-500"
                      : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            />
            <span className="mt-2 block truncate text-center text-[11px] font-medium text-zinc-500 dark:text-zinc-400 sm:text-xs">
              {practice.stages[exercise.exercise_type]}
              {doneWithHelp && <span className="sr-only"> ({practice.completedWithHelpLabel})</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function ExerciseInput({
  exercise,
  answer,
  onAnswerChange,
  ordering,
  onOrderingChange,
  disabled,
  practice,
}: {
  exercise: CuratedPracticeExercise;
  answer: string;
  onAnswerChange: (answer: string) => void;
  ordering: readonly string[];
  onOrderingChange: (ordering: readonly string[]) => void;
  disabled: boolean;
  practice: AppCopy["practice"];
}) {
  if (exercise.exercise_type === "recognize") {
    return (
      <fieldset className="grid gap-3">
        <legend className="sr-only">{practice.selectAnswer}</legend>
        {exercise.options?.map((option) => (
          <ChoiceCard
            key={option}
            selected={answer === option}
            onClick={() => onAnswerChange(option)}
            disabled={disabled}
          >
            <span className="text-sm leading-6">{option}</span>
          </ChoiceCard>
        ))}
      </fieldset>
    );
  }

  if (exercise.exercise_type === "organize") {
    // The bank supports two equally valid reviewed formats for organisation:
    // choose a complete order (useful for short sequences) or physically
    // reorder the source cards (useful when authors store every sentence).
    if (typeof exercise.correct_answer === "string") {
      return (
        <fieldset className="grid gap-3">
          <legend className="sr-only">{practice.selectOrder}</legend>
          {exercise.options?.map((option) => (
            <ChoiceCard
              key={option}
              selected={answer === option}
              onClick={() => onAnswerChange(option)}
              disabled={disabled}
            >
              <span className="text-sm leading-6">{option}</span>
            </ChoiceCard>
          ))}
        </fieldset>
      );
    }
    return (
      <div className="grid gap-2" aria-label={practice.reorderItems}>
        {ordering.map((item, index) => (
          <div
            key={item}
            className="flex items-center gap-2 rounded-xl border border-black/[.1] bg-white p-3 dark:border-white/[.16] dark:bg-zinc-950"
          >
            <span className="w-5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{index + 1}</span>
            <p className="min-w-0 flex-1 text-sm leading-5">{item}</p>
            <div className="flex shrink-0 gap-1">
              <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => {
                  const next = [...ordering];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  onOrderingChange(next);
                }}
                className="rounded-lg border border-black/[.12] px-2 py-1 text-xs hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {practice.moveUp}
              </button>
              <button
                type="button"
                disabled={disabled || index === ordering.length - 1}
                onClick={() => {
                  const next = [...ordering];
                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                  onOrderingChange(next);
                }}
                className="rounded-lg border border-black/[.12] px-2 py-1 text-xs hover:bg-black/[.04] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {practice.moveDown}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const isIndependentWriting = exercise.exercise_type === "develop" || exercise.exercise_type === "produce";
  return (
    <textarea
      value={answer}
      disabled={disabled}
      onChange={(event) => onAnswerChange(event.target.value)}
      rows={isIndependentWriting ? 6 : 3}
      aria-label={practice.responseLabel}
      placeholder={
        isIndependentWriting
          ? practice.responsePlaceholder
          : practice.suggestionPlaceholder
      }
      className="w-full resize-y rounded-xl border border-black/[.15] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-zinc-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/[.2] dark:bg-zinc-950 dark:focus:border-violet-300 dark:focus:ring-violet-950"
    />
  );
}

export function PracticeTrainer({ curriculum }: PracticeTrainerProps) {
  const practice = useAppCopy().practice;
  const [selectedTask, setSelectedTask] = useState<PracticeTask | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<PracticeLevel | null>(null);
  // A skill label/ID is scoped to a task and level. Keeping the selected
  // record, rather than resolving a bare ID against the full catalogue,
  // prevents a future shared label such as "conclusion" from loading the
  // sequence belonging to another Tâche.
  const [selectedSkill, setSelectedSkill] = useState<CuratedPracticeSkill | null>(null);
  const [exerciseOrder, setExerciseOrder] = useState<readonly CuratedPracticeExercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [ordering, setOrdering] = useState<readonly string[]>([]);
  const [checkState, setCheckState] = useState<CheckState>(null);
  const [isSequenceComplete, setIsSequenceComplete] = useState(false);
  const [difficultyRatings, setDifficultyRatings] = useState<ReadonlyMap<string, DifficultyRating>>(new Map());
  // Tracked separately from checkState so a stage's completion method
  // survives navigating to later stages, letting the progress bar keep
  // showing which earlier stages were solved versus revealed.
  const [completionMethods, setCompletionMethods] = useState<ReadonlyMap<string, CompletionMethod>>(new Map());
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [savedSession, setSavedSession] = useState<StoredPracticeSession | null>(null);

  const matchingSkills = useMemo(
    () =>
      selectedTask && selectedLevel
        ? curriculum.skills
            .filter((skill) => skill.task === selectedTask && skill.level === selectedLevel)
            .sort((left, right) => left.part_order - right.part_order)
        : [],
    [curriculum.skills, selectedLevel, selectedTask],
  );
  const availableLevels = useMemo(
    () =>
      selectedTask
        ? LEVELS.filter((level) =>
            curriculum.skills.some(
              (skill) =>
                skill.task === selectedTask &&
                skill.level === level &&
                skill.is_available &&
                (!selectedSkill || skill.id === selectedSkill.id),
            ),
          )
        : [],
    [curriculum.skills, selectedSkill, selectedTask],
  );
  const exercises = exerciseOrder;
  const currentExercise = exercises[currentExerciseIndex] ?? null;
  const isIndependentWriting =
    currentExercise?.exercise_type === "develop" || currentExercise?.exercise_type === "produce";
  const hasAnswer =
    currentExercise?.exercise_type === "organize" && Array.isArray(currentExercise.correct_answer)
      ? ordering.length > 0
      : answer.trim().length > 0;
  const reviewedAnswers = getReviewedAnswers(currentExercise);
  const canRevealAnswer = !isIndependentWriting && reviewedAnswers.length > 0;
  const isExerciseComplete =
    checkState === "correct" || checkState === "revealed" || checkState === "self-review";

  function clearLocalSession() {
    const storage = getBrowserStorage();
    if (storage) clearStoredPracticeSession(storage);
    setSavedSession(null);
  }

  useEffect(() => {
    const storage = getBrowserStorage();
    const session = storage ? loadStoredPracticeSession(storage) : null;
    const timeoutId = window.setTimeout(() => {
      if (session && resolveStoredSession(curriculum, session)) {
        setSavedSession(session);
      } else if (session && storage) {
        clearStoredPracticeSession(storage);
      }
      setStorageLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [curriculum]);

  useEffect(() => {
    if (
      !storageLoaded ||
      !selectedSkill ||
      !currentExercise ||
      exercises.length === 0 ||
      isSequenceComplete
    ) {
      return;
    }

    const storage = getBrowserStorage();
    if (!storage) return;

    saveStoredPracticeSession(storage, {
      version: 1,
      task: selectedSkill.task,
      level: selectedSkill.level,
      skillId: selectedSkill.id,
      exerciseIds: exercises.map((exercise) => exercise.id),
      currentExerciseIndex,
      answer,
      ordering,
      checkState,
      completionMethods: [...completionMethods.entries()],
      difficultyRatings: [...difficultyRatings.entries()],
    });
  }, [
    answer,
    checkState,
    completionMethods,
    currentExercise,
    currentExerciseIndex,
    difficultyRatings,
    exercises,
    isSequenceComplete,
    ordering,
    selectedSkill,
    storageLoaded,
  ]);

  function resetExercise(nextExercise: CuratedPracticeExercise | null) {
    setAnswer("");
    setOrdering(nextExercise?.exercise_type === "organize" ? [...(nextExercise.options ?? [])] : []);
    setCheckState(null);
  }

  function chooseTask(task: PracticeTask) {
    clearLocalSession();
    setSelectedTask(task);
    setSelectedLevel(null);
    setSelectedSkill(null);
    setExerciseOrder([]);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    setDifficultyRatings(new Map());
    resetExercise(null);
  }

  function chooseLevel(level: PracticeLevel) {
    clearLocalSession();
    setSelectedLevel(level);
    setSelectedSkill(null);
    setExerciseOrder([]);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    setDifficultyRatings(new Map());
    resetExercise(null);
  }

  function chooseSkill(skill: CuratedPracticeSkill) {
    clearLocalSession();
    setSelectedSkill(skill);
    setExerciseOrder([]);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    setCompletionMethods(new Map());
    setDifficultyRatings(new Map());
    resetExercise(null);
  }

  function startSequence() {
    if (!selectedSkill || !selectedSkill.is_available) return;
    clearLocalSession();
    // The scaffold stage order (Recognize -> ... -> Produce) is always fixed;
    // when a stage has more than one reviewed variant, a random one is used
    // so replaying a task part doesn't always show the identical exercise.
    const nextExercises = selectPracticeExerciseSession(getExercisesForSkill(curriculum, selectedSkill));
    setExerciseOrder(nextExercises);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    setCompletionMethods(new Map());
    setDifficultyRatings(new Map());
    resetExercise(nextExercises[0] ?? null);
  }

  function updateAnswer(nextAnswer: string) {
    setAnswer(nextAnswer);
    setCheckState(null);
  }

  function updateOrdering(nextOrdering: readonly string[]) {
    setOrdering(nextOrdering);
    setCheckState(null);
  }

  function markCompletion(exerciseId: string, method: CompletionMethod) {
    setCompletionMethods((previous) => new Map(previous).set(exerciseId, method));
  }

  function rateExercise(exerciseId: string, rating: DifficultyRating) {
    setDifficultyRatings((previous) => new Map(previous).set(exerciseId, rating));
  }

  function checkAnswer() {
    if (!currentExercise) return;
    if (isIndependentWriting) {
      setCheckState("self-review");
      markCompletion(currentExercise.id, "self-review");
      return;
    }

    const correct =
      currentExercise.exercise_type === "organize" && Array.isArray(currentExercise.correct_answer)
        ? isOrderedCorrect(ordering, currentExercise)
        : matchesAnswer(answer, currentExercise);
    setCheckState(correct ? "correct" : "try-again");
    if (correct) markCompletion(currentExercise.id, "correct");
  }

  function revealAnswer() {
    if (!canRevealAnswer || !currentExercise) return;
    setCheckState("revealed");
    markCompletion(currentExercise.id, "revealed");
  }

  function moveNext() {
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      clearLocalSession();
      setIsSequenceComplete(true);
      return;
    }
    setCurrentExerciseIndex(nextIndex);
    resetExercise(exercises[nextIndex]);
  }

  function restartSequence() {
    if (!selectedSkill) return;
    clearLocalSession();
    // The stage order stays fixed on replay too; only the variant chosen for
    // a stage with more than one reviewed option can change.
    const previousExerciseIds = new Set(exercises.map((exercise) => exercise.id));
    const nextExercises = selectPracticeExerciseSession(
      getExercisesForSkill(curriculum, selectedSkill),
      Math.random,
      previousExerciseIds,
    );
    setExerciseOrder(nextExercises);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    setCompletionMethods(new Map());
    setDifficultyRatings(new Map());
    resetExercise(nextExercises[0] ?? null);
  }

  function returnToSkills() {
    clearLocalSession();
    setSelectedSkill(null);
    setExerciseOrder([]);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    setCompletionMethods(new Map());
    setDifficultyRatings(new Map());
    resetExercise(null);
  }

  function resumeSavedSession() {
    if (!savedSession) return;
    const resolved = resolveStoredSession(curriculum, savedSession);
    if (!resolved) {
      clearLocalSession();
      return;
    }

    const currentSavedExercise = resolved.exercises[savedSession.currentExerciseIndex];
    setSelectedTask(resolved.skill.task);
    setSelectedLevel(resolved.skill.level);
    setSelectedSkill(resolved.skill);
    setExerciseOrder(resolved.exercises);
    setCurrentExerciseIndex(savedSession.currentExerciseIndex);
    setAnswer(savedSession.answer);
    setOrdering(
      currentSavedExercise.exercise_type === "organize"
        ? savedSession.ordering.length > 0
          ? savedSession.ordering
          : [...(currentSavedExercise.options ?? [])]
        : [],
    );
    setCheckState(savedSession.checkState);
    setCompletionMethods(new Map(savedSession.completionMethods));
    setDifficultyRatings(new Map(savedSession.difficultyRatings));
    setIsSequenceComplete(false);
    setSavedSession(null);
  }

  const resumableSession = savedSession ? resolveStoredSession(curriculum, savedSession) : null;

  // Keeping all three selectors on one screen makes the dependency visible
  // while avoiding a modal or a three-page setup. Disabled later choices
  // prevent invalid combinations; their nearby explanation tells the learner
  // how to recover rather than leaving an inert control unexplained.
  if (!selectedSkill || !currentExercise || isSequenceComplete) {
    if (isSequenceComplete && selectedSkill) {
      return (
        <section aria-labelledby="practice-complete-heading" className="w-full">
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-6 sm:p-8 dark:border-violet-900 dark:bg-violet-950/40">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">{practice.completedEyebrow}</p>
            <h1 id="practice-complete-heading" className="mt-2 text-3xl font-semibold tracking-tight">
              {practice.completedTitle({ part: selectedSkill.label })}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-700 dark:text-zinc-300">
              {practice.completedDescription({ outcome: selectedSkill.learning_outcome })}
            </p>
            <p className="mt-3 text-sm leading-6 text-violet-950/80 dark:text-violet-100/80">
              {practice.nextActionDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={restartSequence}
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                {practice.replayWithVariants}
              </button>
              <button
                type="button"
                onClick={startSequence}
                className="rounded-full border border-black/[.15] px-5 py-2.5 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {practice.startFresh}
              </button>
              <button
                type="button"
                onClick={returnToSkills}
                className="rounded-full border border-black/[.15] px-5 py-2.5 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {practice.chooseAnotherPart}
              </button>
              <Link
                href="/tasks"
                className="rounded-full border border-black/[.15] px-5 py-2.5 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {practice.tryFullTask}
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section aria-labelledby="practice-heading" className="flex w-full flex-col gap-8">
        <header data-walkthrough="practice-intro">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{practice.eyebrow}</p>
          <h1 id="practice-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {practice.title}
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            {practice.description}
          </p>
        </header>

        {savedSession && resumableSession && (
          <aside aria-labelledby="resume-practice-heading" className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">{practice.resumeEyebrow}</p>
            <h2 id="resume-practice-heading" className="mt-1 text-xl font-semibold">
              {practice.resumeTitle({ part: resumableSession.skill.label })}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              {practice.resumeDescription({
                step: savedSession.currentExerciseIndex + 1,
                total: resumableSession.exercises.length,
              })}
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-600 dark:text-zinc-400">{practice.localSessionNotice}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resumeSavedSession}
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                {practice.resumeSession}
              </button>
              <button
                type="button"
                onClick={clearLocalSession}
                className="rounded-full border border-black/[.15] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                {practice.discardSavedSession}
              </button>
            </div>
          </aside>
        )}

        <div className="grid gap-6">
          <fieldset>
            <legend className="text-sm font-semibold">{practice.chooseTask}</legend>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {TASKS.map((task) => (
                <ChoiceCard key={task} selected={selectedTask === task} onClick={() => chooseTask(task)}>
                  <strong className="block text-base">{practice.tasks[task].title}</strong>
                  <span className="mt-1 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">{practice.tasks[task].description}</span>
                </ChoiceCard>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={!selectedTask} aria-describedby={!selectedTask ? "level-help" : undefined}>
            <legend className="text-sm font-semibold">{practice.chooseLevel}</legend>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {LEVELS.map((level) => (
                <ChoiceCard
                  key={level}
                  selected={selectedLevel === level}
                  onClick={() => chooseLevel(level)}
                  disabled={!selectedTask}
                >
                  <strong className="block text-base">{level}</strong>
                  <span className="mt-1 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">{practice.levels[level].description}</span>
                </ChoiceCard>
              ))}
            </div>
            {!selectedTask && (
              <p id="level-help" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {practice.levelHelp}
              </p>
            )}
          </fieldset>

          <fieldset
            data-walkthrough="practice-part-selector"
            disabled={!selectedTask || !selectedLevel}
            aria-describedby={!selectedLevel ? "part-help" : undefined}
          >
            <legend id="practice-part-label" className="text-sm font-semibold">{practice.choosePart}</legend>
            <ThemedSelect<string>
              value={selectedSkill?.id ?? ""}
              options={[
                { value: "", label: practice.partPlaceholder },
                ...matchingSkills.map((skill) => ({
                  value: skill.id,
                  label: `${practice.partLabel({ order: skill.part_order })}: ${skill.label} — ${skill.description}`,
                })),
              ] satisfies readonly ThemedSelectOption<string>[]}
              disabled={!selectedTask || !selectedLevel}
              ariaLabelledBy="practice-part-label"
              onChange={(skillId) => {
                const skill = matchingSkills.find((candidate) => candidate.id === skillId);
                if (skill) {
                  chooseSkill(skill);
                } else if (!skillId) {
                  returnToSkills();
                }
              }}
              buttonClassName={`mt-3 ${SELECT_BUTTON_CLASS}`}
              listClassName={SELECT_LIST_CLASS}
            />
            {selectedSkill && !selectedSkill.is_available && (
              <aside className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <p className="font-semibold">
                  {practice.unavailableTitle({
                    task: `${practice.tasks[selectedSkill.task].title} · ${practice.partLabel({ order: selectedSkill.part_order })}: ${selectedSkill.label}`,
                    level: selectedSkill.level,
                  })}
                </p>
                <p className="mt-1">{practice.unavailableDescription}</p>
                {availableLevels.length > 0 ? (
                  <div className="mt-3">
                    <p className="font-medium">{practice.availableLevelsLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableLevels.map((level) => {
                        const topicCount = curriculum.skills.filter(
                          (skill) => skill.task === selectedTask && skill.level === level && skill.is_available,
                        ).length;
                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() => chooseLevel(level)}
                            className="rounded-full border border-amber-700/30 bg-white/70 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white dark:border-amber-200/30 dark:bg-black/10 dark:hover:bg-black/20"
                          >
                            {practice.availableLevel({ level, parts: topicCount })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2">{practice.unavailableCombination}</p>
                )}
              </aside>
            )}
            {(!selectedTask || !selectedLevel) && (
              <p id="part-help" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {practice.partHelp}
              </p>
            )}
          </fieldset>

          {selectedSkill?.is_available && (
            <aside aria-labelledby="practice-preview-heading" className="rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">{practice.previewEyebrow}</p>
              <h2 id="practice-preview-heading" className="mt-1 text-xl font-semibold">
                {practice.previewTitle({ part: `${practice.partLabel({ order: selectedSkill.part_order })}: ${selectedSkill.label}` })}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold">{practice.previewOutcomeLabel}</span> {selectedSkill.learning_outcome}
              </p>
              <p className="mt-3 text-sm font-medium text-violet-900 dark:text-violet-100">
                {practice.durationAndSteps({ minutes: selectedSkill.estimated_minutes, steps: EXERCISE_STAGES.length })}
              </p>
              <div className="mt-4">
                <p className="text-sm font-semibold">{practice.previewStagesLabel}</p>
                <ol className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {EXERCISE_STAGES.map((stage, index) => (
                    <li key={stage} className="rounded-xl bg-white/70 px-3 py-2 text-sm dark:bg-black/15">
                      <span className="mr-2 text-xs font-semibold text-violet-700 dark:text-violet-300">{index + 1}</span>
                      {practice.stages[stage]}
                    </li>
                  ))}
                </ol>
              </div>
              <button
                type="button"
                onClick={startSequence}
                className="mt-5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                {practice.startFresh}
              </button>
            </aside>
          )}
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="exercise-heading" className="flex w-full flex-col gap-6">
      <button
        type="button"
        onClick={returnToSkills}
        className="w-fit text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
      >
        {practice.changePart}
      </button>

      <header>
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {practice.tasks[selectedSkill.task].title} · {selectedSkill.level} · {practice.partLabel({ order: selectedSkill.part_order })}: {selectedSkill.label}
        </p>
        <h1 id="exercise-heading" className="mt-2 text-3xl font-semibold tracking-tight">
          {selectedSkill.learning_outcome}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {selectedSkill.description} {practice.sequenceDescription({ count: exercises.length })}
        </p>
      </header>

      <ProgressSteps
        exercises={exercises}
        currentIndex={currentExerciseIndex}
        completionMethods={completionMethods}
        practice={practice}
      />
      <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:bg-white/[.06] dark:text-zinc-300">
        {practice.stageMap({
          current: practice.stages[currentExercise.exercise_type],
          next: exercises[currentExerciseIndex + 1]
            ? practice.stages[exercises[currentExerciseIndex + 1].exercise_type]
            : null,
        })}
      </p>

      <article className="rounded-3xl border border-black/[.1] bg-white p-5 shadow-sm sm:p-7 dark:border-white/[.15] dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            {practice.stages[currentExercise.exercise_type]}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {practice.progress({ step: currentExerciseIndex + 1, total: exercises.length })}
          </span>
        </div>
        <h2 className="mt-5 text-xl font-semibold leading-7">{currentExercise.prompt}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{currentExercise.instructions}</p>
        <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-white/[.06] dark:text-zinc-300">
          <span className="font-semibold">{practice.attentionLabel}</span> {currentExercise.target_language_feature}
        </p>

        <div className="mt-5">
          <ExerciseInput
            exercise={currentExercise}
            answer={answer}
            onAnswerChange={updateAnswer}
            ordering={ordering}
            onOrderingChange={updateOrdering}
            disabled={isExerciseComplete}
            practice={practice}
          />
        </div>

        {checkState && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${
              checkState === "correct"
                ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                : checkState === "self-review" || checkState === "revealed"
                  ? "border-violet-300 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100"
                  : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            }`}
          >
            <p className="font-semibold">
              {checkState === "correct"
                ? practice.correctFeedback
                : checkState === "self-review"
                  ? practice.selfReviewFeedback
                  : checkState === "revealed"
                    ? practice.revealedFeedback
                  : practice.retryFeedback}
            </p>
            <p className="mt-3">
              <span className="font-semibold">{practice.explanationLabel}</span> {currentExercise.explanation}
            </p>
            {checkState === "revealed" && (
              <div className="mt-3 rounded-lg bg-white/60 px-3 py-2 dark:bg-black/15">
                <p className="font-medium">{practice.reviewedAnswerLabel}</p>
                {currentExercise.exercise_type === "organize" && reviewedAnswers.length > 1 ? (
                  <ol className="mt-1 list-decimal space-y-1 pl-5">
                    {reviewedAnswers.map((reviewedAnswer) => (
                      <li key={reviewedAnswer}>{reviewedAnswer}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-1">{reviewedAnswers.join(" / ")}</p>
                )}
              </div>
            )}
            {checkState === "self-review" && currentExercise.self_check && (
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {currentExercise.self_check.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isExerciseComplete && (
          <fieldset className="mt-5 border-t border-black/[.08] pt-5 dark:border-white/[.12]">
            <legend className="text-sm font-semibold">{practice.difficultyPrompt}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {DIFFICULTY_RATINGS.map((rating) => {
                const selected = difficultyRatings.get(currentExercise.id) === rating;
                const label =
                  rating === "too-easy"
                    ? practice.difficultyTooEasy
                    : rating === "appropriate"
                      ? practice.difficultyAppropriate
                      : practice.difficultyTooHard;
                return (
                  <button
                    key={rating}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => rateExercise(currentExercise.id, rating)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? "border-violet-600 bg-violet-50 text-violet-900 dark:border-violet-300 dark:bg-violet-950/50 dark:text-violet-100"
                        : "border-black/[.15] hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {difficultyRatings.has(currentExercise.id) && (
              <p role="status" className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {practice.difficultyRecorded}
              </p>
            )}
          </fieldset>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isExerciseComplete ? (
            <button
              type="button"
              onClick={moveNext}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              {currentExerciseIndex + 1 === exercises.length ? practice.finishSequence : practice.nextExercise}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!hasAnswer}
                onClick={checkAnswer}
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-[#ccc]"
              >
                {isIndependentWriting ? practice.selfReview : practice.verify}
              </button>
              {canRevealAnswer && (
                <button
                  type="button"
                  onClick={revealAnswer}
                  className="rounded-full border border-black/[.15] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                >
                  {practice.revealAnswer}
                </button>
              )}
            </>
          )}
          {checkState === "try-again" && (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">{practice.retryHint}</span>
          )}
        </div>
      </article>
    </section>
  );
}
