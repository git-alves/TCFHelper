"use client";

import { useMemo, useState } from "react";

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

const TASKS: readonly {
  id: PracticeTask;
  title: string;
  description: string;
}[] = [
  {
    id: "TASK_1",
    title: "Tâche 1",
    description: "Communiquer efficacement dans un message court, avec le bon destinataire et le bon registre.",
  },
  {
    id: "TASK_2",
    title: "Tâche 2",
    description: "Raconter et commenter une expérience dans un e-mail ou un billet de blog pour des lecteurs précis.",
  },
  {
    id: "TASK_3",
    title: "Tâche 3",
    description: "Comparer des points de vue et défendre une position nuancée sur un sujet de société.",
  },
];

const LEVELS: readonly {
  id: PracticeLevel;
  title: string;
  description: string;
}[] = [
  { id: "B2", title: "B2", description: "Idées claires, reliées et suffisamment développées." },
  { id: "C1", title: "C1", description: "Organisation flexible, points de vue mis en relation et nuance." },
  { id: "C2", title: "C2", description: "Maîtrise très précise, autonome et adaptée à la situation." },
];

const EXERCISE_LABELS: Record<PracticeExerciseType, string> = {
  recognize: "Reconnaître",
  complete: "Compléter",
  transform: "Transformer",
  organize: "Organiser",
  develop: "Développer",
  produce: "Produire",
};

type CheckState = "correct" | "try-again" | "self-review" | null;

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
}: {
  exercises: readonly CuratedPracticeExercise[];
  currentIndex: number;
}) {
  return (
    <ol aria-label="Progression de la séquence" className="grid grid-cols-6 gap-1 sm:gap-2">
      {exercises.map((exercise, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "future";
        return (
          <li key={exercise.id} className="min-w-0">
            <div
              aria-current={state === "current" ? "step" : undefined}
              className={`h-1.5 rounded-full ${
                state === "done"
                  ? "bg-violet-600 dark:bg-violet-300"
                  : state === "current"
                    ? "bg-violet-400 dark:bg-violet-500"
                    : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            />
            <span className="mt-2 block truncate text-center text-[11px] font-medium text-zinc-500 dark:text-zinc-400 sm:text-xs">
              {EXERCISE_LABELS[exercise.exercise_type]}
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
}: {
  exercise: CuratedPracticeExercise;
  answer: string;
  onAnswerChange: (answer: string) => void;
  ordering: readonly string[];
  onOrderingChange: (ordering: readonly string[]) => void;
  disabled: boolean;
}) {
  if (exercise.exercise_type === "recognize") {
    return (
      <fieldset className="grid gap-3">
        <legend className="sr-only">Choisissez votre réponse</legend>
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
          <legend className="sr-only">Choisissez l’ordre le plus logique</legend>
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
      <div className="grid gap-2" aria-label="Réorganisez les éléments">
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
                Monter
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
                Descendre
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
      aria-label="Votre réponse en français"
      placeholder={
        isIndependentWriting
          ? "Écrivez votre réponse en français…"
          : "Écrivez votre proposition en français…"
      }
      className="w-full resize-y rounded-xl border border-black/[.15] bg-white px-4 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-zinc-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/[.2] dark:bg-zinc-950 dark:focus:border-violet-300 dark:focus:ring-violet-950"
    />
  );
}

export function PracticeTrainer({ curriculum }: PracticeTrainerProps) {
  const [selectedTask, setSelectedTask] = useState<PracticeTask | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<PracticeLevel | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [ordering, setOrdering] = useState<readonly string[]>([]);
  const [checkState, setCheckState] = useState<CheckState>(null);
  const [isSequenceComplete, setIsSequenceComplete] = useState(false);

  const matchingSkills = useMemo(
    () =>
      selectedTask && selectedLevel
        ? curriculum.skills.filter((skill) => skill.task === selectedTask && skill.level === selectedLevel)
        : [],
    [curriculum.skills, selectedLevel, selectedTask],
  );
  const selectedSkill = curriculum.skills.find((skill) => skill.id === selectedSkillId) ?? null;
  const exercises = useMemo(
    () =>
      selectedSkill
        ? curriculum.exercises
            .filter(
              (exercise) =>
                exercise.task === selectedSkill.task &&
                exercise.level === selectedSkill.level &&
                exercise.skill === selectedSkill.id,
            )
            .sort((left, right) => left.sequence_order - right.sequence_order)
        : [],
    [curriculum.exercises, selectedSkill],
  );
  const currentExercise = exercises[currentExerciseIndex] ?? null;
  const isIndependentWriting =
    currentExercise?.exercise_type === "develop" || currentExercise?.exercise_type === "produce";
  const hasAnswer =
    currentExercise?.exercise_type === "organize" && Array.isArray(currentExercise.correct_answer)
      ? ordering.length > 0
      : answer.trim().length > 0;

  function resetExercise(nextExercise: CuratedPracticeExercise | null) {
    setAnswer("");
    setOrdering(nextExercise?.exercise_type === "organize" ? [...(nextExercise.options ?? [])] : []);
    setCheckState(null);
  }

  function chooseTask(task: PracticeTask) {
    setSelectedTask(task);
    setSelectedSkillId(null);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    resetExercise(null);
  }

  function chooseLevel(level: PracticeLevel) {
    setSelectedLevel(level);
    setSelectedSkillId(null);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    resetExercise(null);
  }

  function chooseSkill(skill: CuratedPracticeSkill) {
    const firstExercise = curriculum.exercises
      .filter(
        (exercise) => exercise.task === skill.task && exercise.level === skill.level && exercise.skill === skill.id,
      )
      .sort((left, right) => left.sequence_order - right.sequence_order)[0];
    setSelectedSkillId(skill.id);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    resetExercise(firstExercise ?? null);
  }

  function updateAnswer(nextAnswer: string) {
    setAnswer(nextAnswer);
    setCheckState(null);
  }

  function updateOrdering(nextOrdering: readonly string[]) {
    setOrdering(nextOrdering);
    setCheckState(null);
  }

  function checkAnswer() {
    if (!currentExercise) return;
    if (isIndependentWriting) {
      setCheckState("self-review");
      return;
    }

    const correct =
      currentExercise.exercise_type === "organize" && Array.isArray(currentExercise.correct_answer)
        ? isOrderedCorrect(ordering, currentExercise)
        : matchesAnswer(answer, currentExercise);
    setCheckState(correct ? "correct" : "try-again");
  }

  function moveNext() {
    const nextIndex = currentExerciseIndex + 1;
    if (nextIndex >= exercises.length) {
      setIsSequenceComplete(true);
      return;
    }
    setCurrentExerciseIndex(nextIndex);
    resetExercise(exercises[nextIndex]);
  }

  function restartSequence() {
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    resetExercise(exercises[0] ?? null);
  }

  function returnToSkills() {
    setSelectedSkillId(null);
    setCurrentExerciseIndex(0);
    setIsSequenceComplete(false);
    resetExercise(null);
  }

  // Keeping all three selectors on one screen makes the dependency visible
  // while avoiding a modal or a three-page setup. Disabled later choices
  // prevent invalid combinations; their nearby explanation tells the learner
  // how to recover rather than leaving an inert control unexplained.
  if (!selectedSkill || !currentExercise || isSequenceComplete) {
    if (isSequenceComplete && selectedSkill) {
      return (
        <section aria-labelledby="practice-complete-heading" className="mx-auto w-full max-w-3xl">
          <div className="rounded-3xl border border-violet-200 bg-violet-50 p-6 sm:p-8 dark:border-violet-900 dark:bg-violet-950/40">
            <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Séquence terminée</p>
            <h1 id="practice-complete-heading" className="mt-2 text-3xl font-semibold tracking-tight">
              Vous avez travaillé : {selectedSkill.label}
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-700 dark:text-zinc-300">
              Vous êtes passé·e de la reconnaissance à la production autonome. Gardez ce repère pour votre prochaine
              rédaction complète : {selectedSkill.learning_outcome}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={restartSequence}
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                Revoir la séquence
              </button>
              <button
                type="button"
                onClick={returnToSkills}
                className="rounded-full border border-black/[.15] px-5 py-2.5 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
              >
                Choisir une autre compétence
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section aria-labelledby="practice-heading" className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Entraînement ciblé</p>
          <h1 id="practice-heading" className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Travaillez une compétence d’écriture à la fois.
          </h1>
          <p className="mt-3 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Ce n’est pas une simulation d’examen. Choisissez une tâche, votre niveau cible et une compétence : vous
            suivrez ensuite une progression guidée, du choix d’une formulation à votre propre texte.
          </p>
        </header>

        <div className="grid gap-6">
          <fieldset>
            <legend className="text-sm font-semibold">1. Quelle tâche voulez-vous améliorer&nbsp;?</legend>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {TASKS.map((task) => (
                <ChoiceCard key={task.id} selected={selectedTask === task.id} onClick={() => chooseTask(task.id)}>
                  <strong className="block text-base">{task.title}</strong>
                  <span className="mt-1 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">{task.description}</span>
                </ChoiceCard>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={!selectedTask} aria-describedby={!selectedTask ? "level-help" : undefined}>
            <legend className="text-sm font-semibold">2. Quel est votre niveau cible&nbsp;?</legend>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {LEVELS.map((level) => (
                <ChoiceCard
                  key={level.id}
                  selected={selectedLevel === level.id}
                  onClick={() => chooseLevel(level.id)}
                  disabled={!selectedTask}
                >
                  <strong className="block text-base">{level.title}</strong>
                  <span className="mt-1 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">{level.description}</span>
                </ChoiceCard>
              ))}
            </div>
            {!selectedTask && (
              <p id="level-help" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Choisissez d’abord une tâche : la difficulté est liée à son objectif d’écriture.
              </p>
            )}
          </fieldset>

          <fieldset disabled={!selectedTask || !selectedLevel} aria-describedby={!selectedLevel ? "skill-help" : undefined}>
            <legend className="text-sm font-semibold">3. Quelle compétence voulez-vous entraîner&nbsp;?</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matchingSkills.map((skill) => (
                <ChoiceCard
                  key={skill.id}
                  selected={selectedSkillId === skill.id}
                  onClick={() => chooseSkill(skill)}
                  disabled={!selectedTask || !selectedLevel}
                >
                  <strong className="block text-base">{skill.label}</strong>
                  <span className="mt-1 block text-sm leading-5 text-zinc-600 dark:text-zinc-400">{skill.description}</span>
                  <span className="mt-3 block text-xs font-medium text-violet-700 dark:text-violet-300">
                    {skill.estimated_minutes} min · progression en 6 étapes
                  </span>
                </ChoiceCard>
              ))}
            </div>
            {selectedTask && selectedLevel && matchingSkills.length === 0 && (
              <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                Cette combinaison n’a pas encore de séquence validée. Choisissez un autre niveau ou une autre tâche :
                nous n’affichons jamais d’exercice généré automatiquement.
              </p>
            )}
            {(!selectedTask || !selectedLevel) && (
              <p id="skill-help" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Les compétences disponibles dépendent de la tâche et du niveau que vous venez de choisir.
              </p>
            )}
          </fieldset>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="exercise-heading" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <button
        type="button"
        onClick={returnToSkills}
        className="w-fit text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
      >
        ← Changer de compétence
      </button>

      <header>
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {TASKS.find((task) => task.id === selectedSkill.task)?.title} · {selectedSkill.level} · {selectedSkill.label}
        </p>
        <h1 id="exercise-heading" className="mt-2 text-3xl font-semibold tracking-tight">
          {selectedSkill.learning_outcome}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {selectedSkill.description} Cette séquence contient {exercises.length} exercices connectés, dans un ordre
          pédagogique fixe.
        </p>
      </header>

      <ProgressSteps exercises={exercises} currentIndex={currentExerciseIndex} />

      <article className="rounded-3xl border border-black/[.1] bg-white p-5 shadow-sm sm:p-7 dark:border-white/[.15] dark:bg-zinc-950">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            {EXERCISE_LABELS[currentExercise.exercise_type]}
          </span>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            Étape {currentExerciseIndex + 1} sur {exercises.length}
          </span>
        </div>
        <h2 className="mt-5 text-xl font-semibold leading-7">{currentExercise.prompt}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{currentExercise.instructions}</p>
        <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-white/[.06] dark:text-zinc-300">
          <span className="font-semibold">Point d’attention&nbsp;:</span> {currentExercise.target_language_feature}
        </p>

        <div className="mt-5">
          <ExerciseInput
            exercise={currentExercise}
            answer={answer}
            onAnswerChange={updateAnswer}
            ordering={ordering}
            onOrderingChange={updateOrdering}
            disabled={checkState === "correct" || checkState === "self-review"}
          />
        </div>

        {checkState && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-5 rounded-xl border px-4 py-3 text-sm leading-6 ${
              checkState === "correct"
                ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                : checkState === "self-review"
                  ? "border-violet-300 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100"
                  : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            }`}
          >
            <p className="font-semibold">
              {checkState === "correct"
                ? "Bien vu."
                : checkState === "self-review"
                  ? "Relisez votre production avec cette grille."
                  : "Pas encore — modifiez votre réponse et réessayez."}
            </p>
            <p className="mt-1">{currentExercise.explanation}</p>
            {checkState === "self-review" && currentExercise.self_check && (
              <ul className="mt-3 list-disc space-y-1 pl-5">
                {currentExercise.self_check.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {checkState === "correct" || checkState === "self-review" ? (
            <button
              type="button"
              onClick={moveNext}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              {currentExerciseIndex + 1 === exercises.length ? "Terminer la séquence" : "Exercice suivant"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!hasAnswer}
              onClick={checkAnswer}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-45 dark:hover:bg-[#ccc]"
            >
              {isIndependentWriting ? "Voir ma grille d’auto-vérification" : "Vérifier"}
            </button>
          )}
          {checkState === "try-again" && (
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Vous pouvez modifier votre réponse autant de fois que nécessaire.</span>
          )}
        </div>
      </article>
    </section>
  );
}
