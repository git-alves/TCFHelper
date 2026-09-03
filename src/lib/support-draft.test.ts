import { afterEach, describe, expect, it } from "vitest";
import { clearSupportDraft, getSessionStorage, loadSupportDraft, saveSupportDraft } from "./support-draft";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    raw: store,
  };
}

function throwingStorage(): Storage {
  const boom = () => {
    throw new DOMException("Storage is disabled", "SecurityError");
  };
  return { getItem: boom, setItem: boom, removeItem: boom } as unknown as Storage;
}

const KEY = "support-draft:learner@example.com";

describe("support draft persistence", () => {
  it("returns null when nothing has been saved yet", () => {
    expect(loadSupportDraft(fakeStorage(), KEY)).toBeNull();
  });

  it("round-trips a saved draft, including the restored-attachment marker", () => {
    const storage = fakeStorage();

    saveSupportDraft(storage, KEY, { category: "BUG", details: "The editor freezes.", attachmentName: "screenshot.png" });

    expect(loadSupportDraft(storage, KEY)).toEqual({
      category: "BUG",
      details: "The editor freezes.",
      attachmentName: "screenshot.png",
    });
  });

  it("overwrites the previous draft on every save rather than accumulating", () => {
    const storage = fakeStorage();

    saveSupportDraft(storage, KEY, { category: "BUG", details: "First.", attachmentName: null });
    saveSupportDraft(storage, KEY, { category: "QUESTION", details: "Second.", attachmentName: null });

    expect(loadSupportDraft(storage, KEY)).toEqual({ category: "QUESTION", details: "Second.", attachmentName: null });
  });

  it("removes the draft entirely once cleared", () => {
    const storage = fakeStorage();
    saveSupportDraft(storage, KEY, { category: "BUG", details: "Broken.", attachmentName: null });

    clearSupportDraft(storage, KEY);

    expect(loadSupportDraft(storage, KEY)).toBeNull();
  });

  it("keeps two accounts' drafts under different keys from colliding", () => {
    const storage = fakeStorage();
    const otherKey = "support-draft:other@example.com";

    saveSupportDraft(storage, KEY, { category: "BUG", details: "Learner A's issue.", attachmentName: null });
    saveSupportDraft(storage, otherKey, { category: "QUESTION", details: "Learner B's question.", attachmentName: null });

    expect(loadSupportDraft(storage, KEY)).toEqual({ category: "BUG", details: "Learner A's issue.", attachmentName: null });
    expect(loadSupportDraft(storage, otherKey)).toEqual({
      category: "QUESTION",
      details: "Learner B's question.",
      attachmentName: null,
    });

    clearSupportDraft(storage, KEY);

    expect(loadSupportDraft(storage, KEY)).toBeNull();
    expect(loadSupportDraft(storage, otherKey)).not.toBeNull();
  });

  it("defaults attachmentName to null for a draft saved before that field existed", () => {
    const storage = fakeStorage({ [KEY]: JSON.stringify({ category: "BUG", details: "Broken." }) });

    expect(loadSupportDraft(storage, KEY)).toEqual({ category: "BUG", details: "Broken.", attachmentName: null });
  });

  it("treats a corrupted or incompatible stored value as no draft, instead of throwing", () => {
    expect(loadSupportDraft(fakeStorage({ [KEY]: "not json" }), KEY)).toBeNull();
    expect(loadSupportDraft(fakeStorage({ [KEY]: JSON.stringify({ category: "BUG" }) }), KEY)).toBeNull();
    expect(loadSupportDraft(fakeStorage({ [KEY]: JSON.stringify(42) }), KEY)).toBeNull();
    expect(
      loadSupportDraft(fakeStorage({ [KEY]: JSON.stringify({ category: "BUG", details: "x", attachmentName: 7 }) }), KEY),
    ).toBeNull();
  });

  it("treats storage that throws on read as no draft, instead of crashing", () => {
    expect(loadSupportDraft(throwingStorage(), KEY)).toBeNull();
  });

  it("swallows a write failure instead of throwing (private browsing, disabled storage, full quota)", () => {
    expect(() => saveSupportDraft(throwingStorage(), KEY, { category: "BUG", details: "x", attachmentName: null })).not.toThrow();
  });

  it("swallows a clear failure instead of throwing", () => {
    expect(() => clearSupportDraft(throwingStorage(), KEY)).not.toThrow();
  });
});

describe("getSessionStorage", () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "sessionStorage", originalDescriptor);
    } else {
      delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
    }
  });

  it("returns null instead of throwing when the sessionStorage getter itself raises (e.g. a sandboxed embedding context)", () => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      get(): Storage {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });

    expect(getSessionStorage()).toBeNull();
  });
});
