export const ACTIVE_PRACTICE_SESSION_STORAGE_KEY = "tcfhelper.practice.active-session.v1";

export type StoredPracticeCheckState = "correct" | "try-again" | "revealed" | "self-review" | null;
export type StoredPracticeCompletionMethod = "correct" | "revealed" | "self-review";
export type StoredPracticeDifficultyRating = "too-easy" | "appropriate" | "too-hard";

/**
 * A deliberately local-only snapshot for resuming an unfinished practice
 * path. It is never sent to the server and is cleared after completion.
 */
export interface StoredPracticeSession {
  version: 1;
  task: "TASK_1" | "TASK_2" | "TASK_3";
  level: "B2" | "C1" | "C2";
  skillId: string;
  exerciseIds: readonly string[];
  currentExerciseIndex: number;
  answer: string;
  ordering: readonly string[];
  checkState: StoredPracticeCheckState;
  completionMethods: readonly (readonly [string, StoredPracticeCompletionMethod])[];
  difficultyRatings: readonly (readonly [string, StoredPracticeDifficultyRating])[];
}

function isStoredPracticeSession(value: unknown): value is StoredPracticeSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredPracticeSession>;
  return (
    session.version === 1 &&
    (session.task === "TASK_1" || session.task === "TASK_2" || session.task === "TASK_3") &&
    (session.level === "B2" || session.level === "C1" || session.level === "C2") &&
    typeof session.skillId === "string" &&
    Array.isArray(session.exerciseIds) &&
    session.exerciseIds.every((id) => typeof id === "string") &&
    typeof session.currentExerciseIndex === "number" &&
    Number.isInteger(session.currentExerciseIndex) &&
    session.currentExerciseIndex >= 0 &&
    typeof session.answer === "string" &&
    Array.isArray(session.ordering) &&
    session.ordering.every((item) => typeof item === "string") &&
    (session.checkState === null ||
      session.checkState === "correct" ||
      session.checkState === "try-again" ||
      session.checkState === "revealed" ||
      session.checkState === "self-review") &&
    Array.isArray(session.completionMethods) &&
    Array.isArray(session.difficultyRatings)
  );
}

export function loadStoredPracticeSession(storage: Pick<Storage, "getItem">): StoredPracticeSession | null {
  try {
    const serialized = storage.getItem(ACTIVE_PRACTICE_SESSION_STORAGE_KEY);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    return isStoredPracticeSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredPracticeSession(
  storage: Pick<Storage, "setItem">,
  session: StoredPracticeSession,
): boolean {
  try {
    storage.setItem(ACTIVE_PRACTICE_SESSION_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredPracticeSession(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(ACTIVE_PRACTICE_SESSION_STORAGE_KEY);
  } catch {
    // Storage may be disabled in private browsing; a live session still works.
  }
}
