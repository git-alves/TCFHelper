// A browser can be shared, so a draft belongs to one app user: it is stored
// under a key that includes the user's internal id, carries that id in the
// stored value, and is never read, written or restored without a known id.
const PRACTICE_DRAFT_STORAGE_PREFIX = "tcfhelper.practice.sectioned-draft.v1:";
export function practiceDraftStorageKey(userId: string): string {
  return `${PRACTICE_DRAFT_STORAGE_PREFIX}${userId}`;
}
// The first version stored every learner's draft under this one key, with no
// owner. It cannot be attributed to anyone, so it is deleted unread.
export const LEGACY_PRACTICE_DRAFT_STORAGE_KEY = "tcfhelper.practice.sectioned-draft.v1";

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

export function loadStoredPracticeDraft(
  storage: Pick<Storage, "getItem">,
  userId: string | null | undefined,
): StoredPracticeDraft | null {
  if (!userId) return null;
  try {
    const serialized = storage.getItem(practiceDraftStorageKey(userId));
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    if (!isStoredPracticeDraft(parsed)) return null;
    const { userId: owner, ...draft } = parsed as StoredPracticeDraft & { userId?: unknown };
    // Even under this user's key, only a draft they own counts.
    return owner === userId ? draft : null;
  } catch {
    return null;
  }
}

export function saveStoredPracticeDraft(
  storage: Pick<Storage, "setItem">,
  userId: string | null | undefined,
  draft: StoredPracticeDraft,
): boolean {
  if (!userId) return false;
  try {
    storage.setItem(practiceDraftStorageKey(userId), JSON.stringify({ ...draft, userId }));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredPracticeDraft(
  storage: Pick<Storage, "removeItem">,
  userId: string | null | undefined,
): void {
  if (!userId) return;
  try {
    storage.removeItem(practiceDraftStorageKey(userId));
  } catch {
    // Storage may be disabled in private browsing; the live exercise still works.
  }
}

/** Deletes the first version's ownerless draft without reading it. */
export function discardLegacyPracticeDraft(storage: Pick<Storage, "removeItem">): void {
  try {
    storage.removeItem(LEGACY_PRACTICE_DRAFT_STORAGE_KEY);
  } catch {
    // Nothing reachable to delete.
  }
}
