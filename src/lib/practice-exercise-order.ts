/**
 * Vary the order in which a learner sees an already-authored practice set.
 *
 * This deliberately shuffles references to fixed exercises only. It never
 * creates prompts, answers, or any new teaching content.
 */
export function randomizePracticeExerciseOrder<T>(
  exercises: readonly T[],
  random: () => number = Math.random,
): T[] {
  const randomized = [...exercises];

  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [randomized[index], randomized[swapIndex]] = [randomized[swapIndex], randomized[index]];
  }

  return randomized;
}
