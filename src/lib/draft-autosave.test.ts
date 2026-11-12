// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeLocalStorage } from "./draft-autosave.test-helpers";
import {
  DRAFT_STORAGE_KEY,
  MAX_SAVED_DRAFTS,
  deleteDraft,
  draftKey,
  getDraftsSnapshot,
  loadDrafts,
  resetDraftMemoryForTest,
  saveDraft,
  subscribeToDrafts,
  type SavedDraft,
  type SavedDraftTopic,
} from "./draft-autosave";

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
  vi.restoreAllMocks();
  window.localStorage.clear();
  resetDraftMemoryForTest();
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
    saveDraft(draft({ key: "a", savedAt: 1 }));
    saveDraft(draft({ key: "b", savedAt: 3 }));
    saveDraft(draft({ key: "c", savedAt: 2 }));

    expect(loadDrafts().map((saved) => saved.key)).toEqual(["b", "c", "a"]);
    expect(JSON.parse(window.localStorage.getItem(DRAFT_STORAGE_KEY)!).drafts).toHaveLength(3);
  });

  it("replaces the draft for the same task + topic rather than adding another", () => {
    saveDraft(draft({ content: "premier", savedAt: 1 }));
    saveDraft(draft({ content: "second", savedAt: 2 }));

    expect(loadDrafts()).toHaveLength(1);
    expect(loadDrafts()[0].content).toBe("second");
  });

  it("keeps only the most recently written few", () => {
    for (let index = 0; index < MAX_SAVED_DRAFTS + 3; index += 1) {
      saveDraft(draft({ key: `k${index}`, savedAt: index }));
    }

    const keys = loadDrafts().map((saved) => saved.key);
    expect(keys).toHaveLength(MAX_SAVED_DRAFTS);
    expect(keys[0]).toBe(`k${MAX_SAVED_DRAFTS + 2}`);
    expect(keys).not.toContain("k0");
  });

  it("deletes one draft and leaves the others", () => {
    saveDraft(draft({ key: "a" }));
    saveDraft(draft({ key: "b", savedAt: 2 }));

    deleteDraft("a");

    expect(loadDrafts().map((saved) => saved.key)).toEqual(["b"]);
    deleteDraft("missing"); // not an error
  });

  it("ignores stored entries that are corrupt, unknown or from an unexpected shape", () => {
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        drafts: [
          draft({ key: "good" }),
          { ...draft({ key: "bad-task" }), taskType: "TASK_9" },
          { ...draft({ key: "bad-topic" }), topic: { kind: "recent", id: 5 } },
          { ...draft({ key: "empty-prompt" }), topic: { kind: "custom", prompt: "  " } },
          "nonsense",
        ],
      }),
    );
    expect(loadDrafts().map((saved) => saved.key)).toEqual(["good"]);

    window.localStorage.setItem(DRAFT_STORAGE_KEY, "{not json");
    expect(loadDrafts()).toEqual([]);
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ drafts: "no" }));
    expect(loadDrafts()).toEqual([]);
  });
});

describe("when localStorage is unavailable or full", () => {
  let restore: (() => void) | undefined;
  afterEach(() => restore?.());

  it("never throws, and keeps drafts for the rest of the page session", () => {
    const fake = installFakeLocalStorage({ failReads: true, failWrites: true });
    restore = fake.restore;

    expect(() => saveDraft(draft({ content: "gardé" }))).not.toThrow();
    expect(fake.calls.getItem).toBeGreaterThan(0); // the blocked store really was tried
    expect(fake.calls.setItem).toBeGreaterThan(0);
    expect(loadDrafts()[0].content).toBe("gardé");
    expect(() => deleteDraft("TASK_2:recent:topic_1")).not.toThrow();
    expect(loadDrafts()).toEqual([]);
  });

  it("falls back to the newest draft alone when the store is full for several", () => {
    const fake = installFakeLocalStorage({ failWrites: (writeNumber) => writeNumber === 2 });
    restore = fake.restore;
    saveDraft(draft({ key: "old", savedAt: 1 })); // write 1
    expect(() => saveDraft(draft({ key: "new", savedAt: 2 }))).not.toThrow(); // write 2 fails, write 3 retries

    expect(fake.calls.setItem).toBe(3);
    const storedDrafts = JSON.parse(fake.contents.get(DRAFT_STORAGE_KEY)!).drafts as SavedDraft[];
    expect(storedDrafts.map((saved) => saved.key)).toEqual(["new"]);
  });

  it("keeps the memory copy when even the retry fails", () => {
    const fake = installFakeLocalStorage({ failWrites: true });
    restore = fake.restore;

    saveDraft(draft({ key: "a", savedAt: 1 }));
    saveDraft(draft({ key: "b", savedAt: 2 }));

    expect(loadDrafts().map((saved) => saved.key)).toEqual(["b", "a"]);
  });
});

describe("the subscribable view", () => {
  it("returns the same array until the drafts change, and notifies subscribers", () => {
    const first = getDraftsSnapshot();
    expect(getDraftsSnapshot()).toBe(first);

    const listener = vi.fn();
    const unsubscribe = subscribeToDrafts(listener);
    saveDraft(draft());

    expect(listener).toHaveBeenCalledTimes(1);
    const second = getDraftsSnapshot();
    expect(second).not.toBe(first);
    expect(second).toHaveLength(1);
    expect(getDraftsSnapshot()).toBe(second);

    unsubscribe();
    saveDraft(draft({ content: "autre" }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
