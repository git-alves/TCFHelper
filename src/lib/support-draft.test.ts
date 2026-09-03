import { describe, expect, it } from "vitest";
import { clearSupportDraft, loadSupportDraft, saveSupportDraft } from "./support-draft";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    raw: store,
  };
}

describe("support draft persistence", () => {
  it("returns null when nothing has been saved yet", () => {
    expect(loadSupportDraft(fakeStorage())).toBeNull();
  });

  it("round-trips a saved draft, including the restored-attachment marker", () => {
    const storage = fakeStorage();

    saveSupportDraft(storage, { category: "BUG", details: "The editor freezes.", attachmentName: "screenshot.png" });

    expect(loadSupportDraft(storage)).toEqual({
      category: "BUG",
      details: "The editor freezes.",
      attachmentName: "screenshot.png",
    });
  });

  it("overwrites the previous draft on every save rather than accumulating", () => {
    const storage = fakeStorage();

    saveSupportDraft(storage, { category: "BUG", details: "First.", attachmentName: null });
    saveSupportDraft(storage, { category: "QUESTION", details: "Second.", attachmentName: null });

    expect(loadSupportDraft(storage)).toEqual({ category: "QUESTION", details: "Second.", attachmentName: null });
  });

  it("removes the draft entirely once cleared", () => {
    const storage = fakeStorage();
    saveSupportDraft(storage, { category: "BUG", details: "Broken.", attachmentName: null });

    clearSupportDraft(storage);

    expect(loadSupportDraft(storage)).toBeNull();
  });

  it("defaults attachmentName to null for a draft saved before that field existed", () => {
    const storage = fakeStorage({ "support-draft": JSON.stringify({ category: "BUG", details: "Broken." }) });

    expect(loadSupportDraft(storage)).toEqual({ category: "BUG", details: "Broken.", attachmentName: null });
  });

  it("treats a corrupted or incompatible stored value as no draft, instead of throwing", () => {
    expect(loadSupportDraft(fakeStorage({ "support-draft": "not json" }))).toBeNull();
    expect(loadSupportDraft(fakeStorage({ "support-draft": JSON.stringify({ category: "BUG" }) }))).toBeNull();
    expect(loadSupportDraft(fakeStorage({ "support-draft": JSON.stringify(42) }))).toBeNull();
    expect(
      loadSupportDraft(
        fakeStorage({ "support-draft": JSON.stringify({ category: "BUG", details: "x", attachmentName: 7 }) }),
      ),
    ).toBeNull();
  });
});
