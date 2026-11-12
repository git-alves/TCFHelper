// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeLocalStorage } from "./draft-autosave.test-helpers";
import {
  DRAFT_MAX_AGE_MS,
  LEGACY_DRAFT_STORAGE_KEY,
  MAX_SAVED_DRAFTS,
  deleteDraft,
  discardLegacyDrafts,
  draftStorageKey,
  draftKey,
  getDraftsSnapshot,
  loadDrafts,
  resetDraftMemoryForTest,
  saveDraft,
  subscribeToDrafts,
  type SavedDraft,
  type SavedDraftTopic,
} from "./draft-autosave";

const A = "user_a";
const B = "user_b";

const recent: SavedDraftTopic = {
  kind: "recent",
  id: "topic_1",
  title: "Le télétravail",
  prompt: "Rédigez un article.",
  guideContext: { profile: "PUBLIC_ARTICLE_OR_NOTE", confidence: "deterministic" },
};

function draft(overrides: Partial<SavedDraft> = {}): SavedDraft {
  return {
    key: "TASK_2:recent:topic_1",
    taskType: "TASK_2",
    topic: recent,
    content: "Bonjour tout le monde.",
    savedAt: 1_000,
    ...overrides,
  };
}

beforeEach(() => {
  // A fixed clock: drafts older than their retention are not offered, and the
  // fixtures below use small savedAt values to order them.
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  vi.restoreAllMocks();
  window.localStorage.clear();
  resetDraftMemoryForTest();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("draftKey", () => {
  it("identifies a task + shared topic by id, and a pasted topic by its trimmed prompt", () => {
    expect(draftKey("TASK_2", recent)).toBe("TASK_2:recent:topic_1");
    const custom = (prompt: string): SavedDraftTopic => ({ kind: "custom", prompt });
    expect(draftKey("TASK_1", custom("  Écrivez.  "))).toBe(draftKey("TASK_1", custom("Écrivez.")));
    expect(draftKey("TASK_1", custom("Écrivez."))).not.toBe(draftKey("TASK_2", custom("Écrivez.")));
    expect(draftKey("TASK_1", custom("Écrivez."))).not.toBe(draftKey("TASK_1", custom("Racontez.")));
  });
});

describe("saving and loading", () => {
  it("round-trips a draft through localStorage, newest first", () => {
    saveDraft(A, draft({ key: "a", savedAt: 1 }));
    saveDraft(A, draft({ key: "b", savedAt: 3 }));
    saveDraft(A, draft({ key: "c", savedAt: 2 }));

    expect(loadDrafts(A).map((saved) => saved.key)).toEqual(["b", "c", "a"]);
    expect(JSON.parse(window.localStorage.getItem(draftStorageKey(A))!).drafts).toHaveLength(3);
  });

  it("replaces the draft for the same task + topic rather than adding another", () => {
    saveDraft(A, draft({ content: "premier", savedAt: 1 }));
    saveDraft(A, draft({ content: "second", savedAt: 2 }));

    expect(loadDrafts(A)).toHaveLength(1);
    expect(loadDrafts(A)[0].content).toBe("second");
  });

  it("keeps only the most recently written few", () => {
    for (let index = 0; index < MAX_SAVED_DRAFTS + 3; index += 1) {
      saveDraft(A, draft({ key: `k${index}`, savedAt: index }));
    }

    const keys = loadDrafts(A).map((saved) => saved.key);
    expect(keys).toHaveLength(MAX_SAVED_DRAFTS);
    expect(keys[0]).toBe(`k${MAX_SAVED_DRAFTS + 2}`);
    expect(keys).not.toContain("k0");
  });

  it("deletes one draft and leaves the others", () => {
    saveDraft(A, draft({ key: "a" }));
    saveDraft(A, draft({ key: "b", savedAt: 2 }));

    deleteDraft(A, "a");

    expect(loadDrafts(A).map((saved) => saved.key)).toEqual(["b"]);
    deleteDraft(A, "missing"); // not an error
  });

  it("ignores stored entries that are corrupt, unknown or from an unexpected shape", () => {
    window.localStorage.setItem(
      draftStorageKey(A),
      JSON.stringify({
        version: 2,
        userId: A,
        drafts: [
          draft({ key: "good", savedAt: Date.now() }),
          { ...draft({ key: "bad-task" }), taskType: "TASK_9" },
          { ...draft({ key: "bad-topic" }), topic: { kind: "recent", id: 5 } },
          { ...draft({ key: "empty-prompt" }), topic: { kind: "custom", prompt: "  " } },
          "nonsense",
        ],
      }),
    );
    expect(loadDrafts(A).map((saved) => saved.key)).toEqual(["good"]);

    window.localStorage.setItem(draftStorageKey(A), "{not json");
    expect(loadDrafts(A)).toEqual([]);
    window.localStorage.setItem(draftStorageKey(A), JSON.stringify({ userId: A, drafts: "no" }));
    expect(loadDrafts(A)).toEqual([]);
  });
});

describe("when localStorage is unavailable or full", () => {
  let restore: (() => void) | undefined;
  afterEach(() => restore?.());

  it("never throws, and keeps drafts for the rest of the page session", () => {
    const fake = installFakeLocalStorage({ failReads: true, failWrites: true });
    restore = fake.restore;

    expect(() => saveDraft(A, draft({ content: "gardé" }))).not.toThrow();
    expect(fake.calls.getItem).toBeGreaterThan(0); // the blocked store really was tried
    expect(fake.calls.setItem).toBeGreaterThan(0);
    expect(loadDrafts(A)[0].content).toBe("gardé");
    expect(() => deleteDraft(A, "TASK_2:recent:topic_1")).not.toThrow();
    expect(loadDrafts(A)).toEqual([]);
  });

  it("falls back to the newest draft alone when the store is full for several", () => {
    const fake = installFakeLocalStorage({ failWrites: (writeNumber) => writeNumber === 2 });
    restore = fake.restore;
    saveDraft(A, draft({ key: "old", savedAt: 1 })); // write 1
    expect(() => saveDraft(A, draft({ key: "new", savedAt: 2 }))).not.toThrow(); // write 2 fails, write 3 retries

    expect(fake.calls.setItem).toBe(3);
    const storedDrafts = JSON.parse(fake.contents.get(draftStorageKey(A))!).drafts as SavedDraft[];
    expect(storedDrafts.map((saved) => saved.key)).toEqual(["new"]);
  });

  it("keeps the memory copy when even the retry fails", () => {
    const fake = installFakeLocalStorage({ failWrites: true });
    restore = fake.restore;

    saveDraft(A, draft({ key: "a", savedAt: 1 }));
    saveDraft(A, draft({ key: "b", savedAt: 2 }));

    expect(loadDrafts(A).map((saved) => saved.key)).toEqual(["b", "a"]);
  });
});

describe("the subscribable view", () => {
  it("returns the same array until the drafts change, and notifies subscribers", () => {
    const first = getDraftsSnapshot(A);
    expect(getDraftsSnapshot(A)).toBe(first);

    const listener = vi.fn();
    const unsubscribe = subscribeToDrafts(A, listener);
    saveDraft(A, draft());

    expect(listener).toHaveBeenCalledTimes(1);
    const second = getDraftsSnapshot(A);
    expect(second).not.toBe(first);
    expect(second).toHaveLength(1);
    expect(getDraftsSnapshot(A)).toBe(second);

    unsubscribe();
    saveDraft(A, draft({ content: "autre" }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("a browser shared by two learners", () => {
  it("never shows one learner's drafts to another, and gives each their own back", () => {
    saveDraft(A, draft({ content: "Le texte privé de A.", savedAt: Date.now() }));

    expect(loadDrafts(B)).toEqual([]);
    expect(getDraftsSnapshot(B)).toEqual([]);

    saveDraft(B, draft({ content: "Le texte de B.", savedAt: Date.now() }));
    deleteDraft(B, "TASK_2:recent:topic_1");

    // B's save and delete left A's draft alone.
    expect(loadDrafts(A).map((saved) => saved.content)).toEqual(["Le texte privé de A."]);
    expect(loadDrafts(B)).toEqual([]);
    expect(window.localStorage.getItem(draftStorageKey(A))).toContain("Le texte privé de A.");
    expect(window.localStorage.getItem(draftStorageKey(B))).not.toContain("Le texte privé de A.");
  });

  it("does nothing without a user id: nothing is read, written or offered", () => {
    saveDraft(A, draft({ savedAt: Date.now() }));

    for (const missing of [undefined, null, ""]) {
      saveDraft(missing, draft({ content: "sans propriétaire", savedAt: Date.now() }));
      expect(loadDrafts(missing)).toEqual([]);
      expect(getDraftsSnapshot(missing)).toEqual([]);
      expect(() => deleteDraft(missing, "TASK_2:recent:topic_1")).not.toThrow();
    }
    expect(loadDrafts(A)).toHaveLength(1);
    expect(window.localStorage.length).toBe(1);
  });

  it("ignores a stored value whose owner is not the user it was read for", () => {
    window.localStorage.setItem(
      draftStorageKey(B),
      JSON.stringify({ version: 2, userId: A, drafts: [draft({ content: "À A", savedAt: Date.now() })] }),
    );

    expect(loadDrafts(B)).toEqual([]);
  });

  it("deletes the first version's ownerless store and never offers it", () => {
    window.localStorage.setItem(
      LEGACY_DRAFT_STORAGE_KEY,
      JSON.stringify({ version: 1, drafts: [draft({ content: "ancien", savedAt: Date.now() })] }),
    );

    expect(loadDrafts(A)).toEqual([]);
    expect(loadDrafts(B)).toEqual([]);

    discardLegacyDrafts();

    expect(window.localStorage.getItem(LEGACY_DRAFT_STORAGE_KEY)).toBeNull();
    expect(() => discardLegacyDrafts()).not.toThrow();
  });

  it("keeps the in-memory fallback per user when storage is blocked, across a user switch", () => {
    const fake = installFakeLocalStorage({ failReads: true, failWrites: true });
    try {
      saveDraft(A, draft({ content: "Le texte de A, en mémoire.", savedAt: Date.now() }));

      expect(fake.calls.setItem).toBeGreaterThan(0); // storage really was tried
      expect(loadDrafts(B)).toEqual([]);
      expect(getDraftsSnapshot(B)).toEqual([]);

      saveDraft(B, draft({ content: "Le texte de B, en mémoire.", savedAt: Date.now() }));
      expect(loadDrafts(A).map((saved) => saved.content)).toEqual(["Le texte de A, en mémoire."]);
      expect(loadDrafts(B).map((saved) => saved.content)).toEqual(["Le texte de B, en mémoire."]);

      deleteDraft(A, "TASK_2:recent:topic_1");
      expect(loadDrafts(A)).toEqual([]);
      expect(loadDrafts(B)).toHaveLength(1);
    } finally {
      fake.restore();
    }
  });

  it("does not offer a draft left on the device for longer than its retention", () => {
    saveDraft(A, draft({ key: "old", savedAt: Date.now() - DRAFT_MAX_AGE_MS - 1_000 }));
    saveDraft(A, draft({ key: "fresh", savedAt: Date.now() }));

    expect(loadDrafts(A).map((saved) => saved.key)).toEqual(["fresh"]);
  });
});
