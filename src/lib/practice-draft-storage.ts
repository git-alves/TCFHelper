export const PRACTICE_DRAFT_STORAGE_KEY = "tcfhelper.practice.sectioned-draft.v1";

/**
 * How a model answer was reached for one section: "written" if the learner
 * had typed something first, "empty" if they looked before writing.
 */
export type StoredSectionReveal = "written" | "empty" | null;

/**
 * A deliberately local-only snapshot of the exercise in progress, so a
 * refresh does not lose the learner's text. It is never sent to the server.
 */
export interface StoredPracticeDraft {
  version: 1;
  exerciseId: string;
  answers: readonly string[];
  reveals: readonly StoredSectionReveal[];
  // Once present, it prevents a refresh from creating a second server session
  // (and so a second Dashboard completion) for the same attempt.
  progressSessionId?: string;
  completionRecorded?: boolean;
}

function isStoredPracticeDraft(value: unknown): value is StoredPracticeDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<StoredPracticeDraft>;
  return (
    draft.version === 1 &&
    typeof draft.exerciseId === "string" &&
    Array.isArray(draft.answers) &&
    draft.answers.every((answer) => typeof answer === "string") &&
    Array.isArray(draft.reveals) &&
    draft.reveals.length === draft.answers.length &&
    draft.reveals.every((reveal) => reveal === null || reveal === "written" || reveal === "empty") &&
    (draft.progressSessionId === undefined || typeof draft.progressSessionId === "string") &&
    (draft.completionRecorded === undefined || typeof draft.completionRecorded === "boolean")
  );
}

export function loadStoredPracticeDraft(storage: Pick<Storage, "getItem">): StoredPracticeDraft | null {
  try {
    const serialized = storage.getItem(PRACTICE_DRAFT_STORAGE_KEY);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    return isStoredPracticeDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveStoredPracticeDraft(storage: Pick<Storage, "setItem">, draft: StoredPracticeDraft): boolean {
  try {
    storage.setItem(PRACTICE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredPracticeDraft(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(PRACTICE_DRAFT_STORAGE_KEY);
  } catch {
    // Storage may be disabled in private browsing; the live exercise still works.
  }
}
