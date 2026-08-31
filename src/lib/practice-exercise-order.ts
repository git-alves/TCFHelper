/**
 * Build one practice session from an already-authored exercise set.
 *
 * The six-stage scaffold order (Recognize -> Complete -> Transform ->
 * Organize -> Develop -> Produce) is fixed and never reordered: it is what
 * takes a learner from controlled recognition to independent production.
 * Replay variety instead comes from picking a different authored variant
 * for a given stage, when more than one reviewed variant exists for it.
 * This never creates prompts, answers, or any new teaching content.
 */
const STAGE_ORDER = ["recognize", "complete", "transform", "organize", "develop", "produce"] as const;

export function selectPracticeExerciseSession<T extends { exercise_type: string }>(
  exercises: readonly T[],
  random: () => number = Math.random,
): T[] {
  return STAGE_ORDER.flatMap((stage) => {
    const variants = exercises.filter((exercise) => exercise.exercise_type === stage);
    if (variants.length === 0) return [];
    const chosenIndex = Math.floor(random() * variants.length);
    return [variants[chosenIndex]];
  });
}
