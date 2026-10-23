import { describe, expect, it } from "vitest";
import {
  PRACTICE_DRAFT_STORAGE_KEY,
  clearStoredPracticeDraft,
  loadStoredPracticeDraft,
  saveStoredPracticeDraft,
  type StoredPracticeDraft,
} from "./practice-draft-storage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const DRAFT: StoredPracticeDraft = {
  version: 1,
  exerciseId: "t1-b2-new-flat",
  answers: ["Salut Camille", "", ""],
  reveals: ["written", null, null],
  progressSessionId: "session_1",
};

describe("practice draft storage", () => {
  it("round-trips a draft", () => {
    const storage = memoryStorage();

    expect(saveStoredPracticeDraft(storage, DRAFT)).toBe(true);
    expect(loadStoredPracticeDraft(storage)).toEqual(DRAFT);
  });

  it("clears a draft", () => {
    const storage = memoryStorage();
    saveStoredPracticeDraft(storage, DRAFT);

    clearStoredPracticeDraft(storage);

    expect(loadStoredPracticeDraft(storage)).toBeNull();
  });

  it.each([
    ["malformed JSON", "{nope"],
    ["an unknown version", JSON.stringify({ ...DRAFT, version: 2 })],
    ["mismatched answers and reveals", JSON.stringify({ ...DRAFT, reveals: [null] })],
    ["a non-string answer", JSON.stringify({ ...DRAFT, answers: [1, 2, 3] })],
    ["an invalid reveal state", JSON.stringify({ ...DRAFT, reveals: ["written", "seen", null] })],
  ])("ignores %s instead of throwing", (_name, raw) => {
    expect(loadStoredPracticeDraft(memoryStorage({ [PRACTICE_DRAFT_STORAGE_KEY]: raw }))).toBeNull();
  });

  it("reports failure instead of throwing when storage is unavailable", () => {
    const failing = {
      setItem: () => {
        throw new Error("quota");
      },
    };

    expect(saveStoredPracticeDraft(failing, DRAFT)).toBe(false);
  });
});
