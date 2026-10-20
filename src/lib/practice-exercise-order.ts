/**
 * Build one practice session from an already-authored exercise set.
 *
 * The session stages (see PRACTICE_SESSION_STAGES) are fixed and never
 * reordered: they take a learner from controlled recognition to independent
 * production. Exercises authored for any other stage are ignored. Replay
 * variety instead comes from picking a different authored variant for a
 * given stage, when more than one reviewed variant exists for it. This never
 * creates prompts, answers, or any new teaching content.
 */
import { PRACTICE_SESSION_STAGES } from "./practice-session-stages";

export function selectPracticeExerciseSession<T extends { exercise_type: string; id: string }>(
  exercises: readonly T[],
  random: () => number = Math.random,
  previousExerciseIds: ReadonlySet<string> = new Set(),
  stages: readonly string[] = PRACTICE_SESSION_STAGES,
): T[] {
  return stages.flatMap((stage) => {
    const variants = exercises.filter((exercise) => exercise.exercise_type === stage);
    if (variants.length === 0) return [];
    // On replay, avoid the last variant for this stage whenever another
    // reviewed option exists. A one-variant stage remains valid and stable.
    const eligibleVariants = variants.filter((exercise) => !previousExerciseIds.has(exercise.id));
    const choices = eligibleVariants.length > 0 ? eligibleVariants : variants;
    const chosenIndex = Math.floor(random() * choices.length);
    return [choices[chosenIndex]];
  });
}
