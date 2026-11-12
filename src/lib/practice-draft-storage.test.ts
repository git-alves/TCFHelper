import { describe, expect, it } from "vitest";
import {
  LEGACY_PRACTICE_DRAFT_STORAGE_KEY,
  clearStoredPracticeDraft,
  discardLegacyPracticeDraft,
  loadStoredPracticeDraft,
  practiceDraftStorageKey,
  saveStoredPracticeDraft,
  type StoredPracticeDraft,
} from "./practice-draft-storage";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const A = "user_a";
const B = "user_b";

const DRAFT: StoredPracticeDraft = {
  version: 1,
  exerciseId: "t1-b2-new-flat",
  answers: ["Salut Camille", "", ""],
  reveals: ["written", null, null],
  progressSessionId: "session_1",
};

describe("practice draft storage", () => {
  it("round-trips a draft for its owner", () => {
    const storage = memoryStorage();

    expect(saveStoredPracticeDraft(storage, A, DRAFT)).toBe(true);
    expect(loadStoredPracticeDraft(storage, A)).toEqual(DRAFT);
    expect(loadStoredPracticeDraft(storage, A)).not.toHaveProperty("userId");
  });

  it("clears a draft", () => {
    const storage = memoryStorage();
    saveStoredPracticeDraft(storage, A, DRAFT);

    clearStoredPracticeDraft(storage, A);

    expect(loadStoredPracticeDraft(storage, A)).toBeNull();
  });

  it.each([
    ["malformed JSON", "{nope"],
    ["an unknown version", JSON.stringify({ ...DRAFT, version: 2, userId: A })],
    ["mismatched answers and reveals", JSON.stringify({ ...DRAFT, reveals: [null], userId: A })],
    ["a non-string answer", JSON.stringify({ ...DRAFT, answers: [1, 2, 3], userId: A })],
    ["an invalid reveal state", JSON.stringify({ ...DRAFT, reveals: ["written", "seen", null], userId: A })],
  ])("ignores %s instead of throwing", (_name, raw) => {
    expect(loadStoredPracticeDraft(memoryStorage({ [practiceDraftStorageKey(A)]: raw }), A)).toBeNull();
  });

  it("reports failure instead of throwing when storage is unavailable", () => {
    const failing = {
      setItem: () => {
        throw new Error("quota");
      },
    };

    expect(saveStoredPracticeDraft(failing, A, DRAFT)).toBe(false);
  });
});

describe("a browser shared by two learners", () => {
  it("never restores one learner's draft for another, and gives each their own back", () => {
    const storage = memoryStorage();
    saveStoredPracticeDraft(storage, A, DRAFT);

    expect(loadStoredPracticeDraft(storage, B)).toBeNull();

    const bDraft = { ...DRAFT, answers: ["Bonjour Léa", "", ""], progressSessionId: "session_b" };
    saveStoredPracticeDraft(storage, B, bDraft);
    clearStoredPracticeDraft(storage, B);

    // B's save and clear left A's draft alone.
    expect(loadStoredPracticeDraft(storage, A)).toEqual(DRAFT);
    expect(loadStoredPracticeDraft(storage, B)).toBeNull();
  });

  it("does nothing without a user id", () => {
    const storage = memoryStorage();
    saveStoredPracticeDraft(storage, A, DRAFT);

    for (const missing of [undefined, null, ""]) {
      expect(saveStoredPracticeDraft(storage, missing, DRAFT)).toBe(false);
      expect(loadStoredPracticeDraft(storage, missing)).toBeNull();
      clearStoredPracticeDraft(storage, missing);
    }

    expect([...storage.data.keys()]).toEqual([practiceDraftStorageKey(A)]);
  });

  it("ignores a stored draft whose owner is not the user it was read for", () => {
    const storage = memoryStorage({ [practiceDraftStorageKey(B)]: JSON.stringify({ ...DRAFT, userId: A }) });

    expect(loadStoredPracticeDraft(storage, B)).toBeNull();
    // A draft with no owner at all is not anyone's.
    storage.data.set(practiceDraftStorageKey(B), JSON.stringify(DRAFT));
    expect(loadStoredPracticeDraft(storage, B)).toBeNull();
  });

  it("deletes the first version's ownerless draft without reading it, and never restores it", () => {
    const reads: string[] = [];
    const storage = memoryStorage({ [LEGACY_PRACTICE_DRAFT_STORAGE_KEY]: JSON.stringify(DRAFT) });
    const watching = {
      ...storage,
      getItem: (key: string) => {
        reads.push(key);
        return storage.getItem(key);
      },
    };

    expect(loadStoredPracticeDraft(watching, A)).toBeNull();
    expect(reads).not.toContain(LEGACY_PRACTICE_DRAFT_STORAGE_KEY);

    discardLegacyPracticeDraft(watching);

    expect(storage.data.has(LEGACY_PRACTICE_DRAFT_STORAGE_KEY)).toBe(false);
    expect(() =>
      discardLegacyPracticeDraft({
        removeItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
  });

  it("does not throw when storage is blocked, for any user", () => {
    const blocked = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      removeItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };

    for (const user of [A, B]) {
      expect(loadStoredPracticeDraft(blocked, user)).toBeNull();
      expect(saveStoredPracticeDraft(blocked, user, DRAFT)).toBe(false);
      expect(() => clearStoredPracticeDraft(blocked, user)).not.toThrow();
    }
  });
});
