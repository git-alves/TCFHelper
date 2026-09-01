import { describe, expect, it } from "vitest";
import {
  ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
  clearStoredPracticeSession,
  loadStoredPracticeSession,
  saveStoredPracticeSession,
  type StoredPracticeSession,
} from "./practice-session-storage";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

const session: StoredPracticeSession = {
  version: 1,
  task: "TASK_3",
  level: "C1",
  skillId: "justifying-position",
  exerciseIds: ["recognize-1", "complete-1"],
  currentExerciseIndex: 1,
  answer: "Ma réponse",
  ordering: [],
  checkState: "try-again",
  completionMethods: [["recognize-1", "correct"]],
  difficultyRatings: [["recognize-1", "appropriate"]],
};

describe("practice session storage", () => {
  it("round-trips an unfinished local practice session", () => {
    const storage = createStorage();

    expect(saveStoredPracticeSession(storage, session)).toBe(true);
    expect(loadStoredPracticeSession(storage)).toEqual(session);
  });

  it("rejects stale or malformed stored values", () => {
    const storage = createStorage();
    storage.setItem(ACTIVE_PRACTICE_SESSION_STORAGE_KEY, JSON.stringify({ version: 2 }));

    expect(loadStoredPracticeSession(storage)).toBeNull();
  });

  it("clears a saved session without affecting the current page state", () => {
    const storage = createStorage();
    saveStoredPracticeSession(storage, session);

    clearStoredPracticeSession(storage);

    expect(storage.values.has(ACTIVE_PRACTICE_SESSION_STORAGE_KEY)).toBe(false);
  });
});
