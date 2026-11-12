// Device-local autosave of the learner's unsent draft, so a reload, a closed
// tab, a session that ends or a failed correction never costs them the text.
// Nothing here is sent to the server. Storage is a convenience: every function
// swallows a browser that blocks or fills localStorage, and a per-tab copy
// keeps the draft available for the rest of the page session in that case.

import { TASK_ORDER } from "@/lib/tcf-tasks";
import type { TaskType } from "@prisma/client";

export const DRAFT_STORAGE_KEY = "mytcflab:drafts";
// Drafts are kept per task + topic. Only the most recently written few are
// retained so the stored value stays small.
export const MAX_SAVED_DRAFTS = 5;

export type SavedDraftTopic =
  | {
      kind: "recent";
      id: string;
      title: string;
      prompt: string;
      guideContext: { profile: string; confidence: "deterministic" | "needs_confirmation" };
    }
  | { kind: "custom"; prompt: string };

export interface SavedDraft {
  key: string;
  taskType: TaskType;
  topic: SavedDraftTopic;
  content: string;
  savedAt: number;
}

/** Identifies a custom prompt compactly; not a security hash. */
export function fingerprintTopicPrompt(prompt: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < prompt.length; index += 1) {
    hash ^= prompt.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

/** The same task + topic identity the timed-practice session uses. */
export function draftKey(taskType: TaskType, topic: SavedDraftTopic): string {
  return topic.kind === "recent"
    ? `${taskType}:recent:${topic.id}`
    : `${taskType}:custom:${fingerprintTopicPrompt(topic.prompt.trim())}`;
}

function isSavedDraft(value: unknown): value is SavedDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;
  if (
    typeof draft.key !== "string" ||
    typeof draft.content !== "string" ||
    typeof draft.savedAt !== "number" ||
    !(TASK_ORDER as readonly unknown[]).includes(draft.taskType)
  ) {
    return false;
  }
  const topic = draft.topic as Record<string, unknown> | null;
  if (!topic || typeof topic !== "object") return false;
  if (topic.kind === "custom") return typeof topic.prompt === "string" && topic.prompt.trim() !== "";
  if (topic.kind !== "recent") return false;
  const context = topic.guideContext as Record<string, unknown> | null;
  return (
    typeof topic.id === "string" &&
    typeof topic.title === "string" &&
    typeof topic.prompt === "string" &&
    !!context &&
    typeof context === "object" &&
    typeof context.profile === "string" &&
    (context.confidence === "deterministic" || context.confidence === "needs_confirmation")
  );
}

// Drafts that could not be written to localStorage (blocked or full), kept for
// the rest of the page session so they can still be restored. Emptied as soon
// as a write succeeds.
let unpersisted: SavedDraft[] = [];

function readStored(): SavedDraft[] | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    const drafts = (parsed as { drafts?: unknown } | null)?.drafts;
    if (!Array.isArray(drafts)) return [];
    return drafts.filter(isSavedDraft);
  } catch {
    // Blocked storage or an unreadable value.
    return null;
  }
}

function writeStored(drafts: SavedDraft[]): boolean {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ version: 1, drafts }));
    return true;
  } catch {
    return false;
  }
}

/** Saved drafts, newest first. Never throws. */
export function loadDrafts(): SavedDraft[] {
  if (typeof window === "undefined") return [];
  const byKey = new Map<string, SavedDraft>();
  for (const draft of [...(readStored() ?? []), ...unpersisted]) {
    const existing = byKey.get(draft.key);
    if (!existing || draft.savedAt >= existing.savedAt) byKey.set(draft.key, draft);
  }
  return [...byKey.values()].sort((a, b) => b.savedAt - a.savedAt);
}

function persist(drafts: SavedDraft[]) {
  memoryVersion += 1;
  if (typeof window !== "undefined") {
    const written =
      writeStored(drafts) ||
      // A full store: keep at least the newest draft, which is the one just
      // written, by dropping the older ones and trying once more.
      (drafts.length > 1 && writeStored(drafts.slice(0, 1)));
    unpersisted = written ? [] : drafts;
  }
  listeners.forEach((listener) => listener());
}

// ---- A subscribable view for useSyncExternalStore ----

const NO_DRAFTS: SavedDraft[] = [];
const listeners = new Set<() => void>();
let memoryVersion = 0;
let snapshotSignature: string | null = null;
let snapshot: SavedDraft[] = NO_DRAFTS;

export function subscribeToDrafts(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab writing a draft.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DRAFT_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The same array until the stored drafts change, as useSyncExternalStore requires. */
export function getDraftsSnapshot(): SavedDraft[] {
  if (typeof window === "undefined") return NO_DRAFTS;
  let signature: string;
  try {
    signature = `s:${window.localStorage.getItem(DRAFT_STORAGE_KEY) ?? ""}`;
  } catch {
    signature = `m:${memoryVersion}`;
  }
  if (signature !== snapshotSignature) {
    snapshotSignature = signature;
    snapshot = loadDrafts();
  }
  return snapshot;
}

export function getServerDraftsSnapshot(): SavedDraft[] {
  return NO_DRAFTS;
}

/** Writes (or replaces) the draft for its task + topic. Never throws. */
export function saveDraft(draft: SavedDraft): void {
  const others = loadDrafts().filter((existing) => existing.key !== draft.key);
  persist([draft, ...others].slice(0, MAX_SAVED_DRAFTS));
}

/** Removes the draft for one task + topic. Never throws. */
export function deleteDraft(key: string): void {
  const drafts = loadDrafts();
  if (!drafts.some((draft) => draft.key === key)) return;
  persist(drafts.filter((draft) => draft.key !== key));
}

/** Test seam: forgets the per-tab copy. */
export function resetDraftMemoryForTest() {
  unpersisted = [];
  memoryVersion += 1;
  snapshotSignature = null;
}
