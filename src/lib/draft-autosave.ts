// Device-local autosave of the learner's unsent draft, so a reload, a closed
// tab, a session that ends or a failed correction never costs them the text.
// Nothing here is sent to the server. Storage is a convenience: every function
// swallows a browser that blocks or fills localStorage, and a per-tab copy
// keeps the draft available for the rest of the page session in that case.
//
// A browser can be shared, so every draft belongs to one app user: it is stored
// under a key that includes the user's internal id, carries that id inside the
// stored value, and is never read, written or offered without a known id. The
// in-memory copy is per user too.

import { TASK_ORDER } from "@/lib/tcf-tasks";
import type { TaskType } from "@prisma/client";

const DRAFT_STORAGE_PREFIX = "mytcflab:drafts:";
export function draftStorageKey(userId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${userId}`;
}
// The first version stored every learner's drafts under this one key, with no
// owner. It cannot be attributed to anyone, so it is deleted, never offered.
export const LEGACY_DRAFT_STORAGE_KEY = "mytcflab:drafts";

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

// Drafts that could not be written to localStorage (blocked or full), kept per
// user for the rest of the page session so they can still be restored. A
// user's entry is emptied as soon as a write for them succeeds.
const unpersisted = new Map<string, SavedDraft[]>();

function readStored(userId: string): SavedDraft[] | null {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(userId));
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as { userId?: unknown; drafts?: unknown } | null;
    // Belt and braces: even under this user's key, only their own envelope counts.
    if (!parsed || parsed.userId !== userId || !Array.isArray(parsed.drafts)) return [];
    return parsed.drafts.filter(isSavedDraft);
  } catch {
    // Blocked storage or an unreadable value.
    return null;
  }
}

function writeStored(userId: string, drafts: SavedDraft[]): boolean {
  try {
    window.localStorage.setItem(draftStorageKey(userId), JSON.stringify({ version: 2, userId, drafts }));
    return true;
  } catch {
    return false;
  }
}

/** This user's saved drafts, newest first. Never throws; empty without a user id. */
export function loadDrafts(userId: string | null | undefined): SavedDraft[] {
  if (!userId || typeof window === "undefined") return [];
  const byKey = new Map<string, SavedDraft>();
  for (const draft of [...(readStored(userId) ?? []), ...(unpersisted.get(userId) ?? [])]) {
    const existing = byKey.get(draft.key);
    if (!existing || draft.savedAt >= existing.savedAt) byKey.set(draft.key, draft);
  }
  return [...byKey.values()].sort((a, b) => b.savedAt - a.savedAt);
}

function persist(userId: string, drafts: SavedDraft[]) {
  memoryVersion += 1;
  const written =
    writeStored(userId, drafts) ||
    // A full store: keep at least the newest draft, which is the one just
    // written, by dropping the older ones and trying once more.
    (drafts.length > 1 && writeStored(userId, drafts.slice(0, 1)));
  if (written) unpersisted.delete(userId);
  else unpersisted.set(userId, drafts);
  listeners.forEach((listener) => listener());
}

// ---- A subscribable view for useSyncExternalStore ----

const NO_DRAFTS: SavedDraft[] = [];
const listeners = new Set<() => void>();
let memoryVersion = 0;
const snapshots = new Map<string, { signature: string; drafts: SavedDraft[] }>();

export function subscribeToDrafts(userId: string | null | undefined, listener: () => void): () => void {
  listeners.add(listener);
  // Another tab writing this user's drafts.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || (userId && event.key === draftStorageKey(userId))) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** This user's drafts: the same array until they change, as useSyncExternalStore requires. */
export function getDraftsSnapshot(userId: string | null | undefined): SavedDraft[] {
  if (!userId || typeof window === "undefined") return NO_DRAFTS;
  let raw: string;
  try {
    raw = window.localStorage.getItem(draftStorageKey(userId)) ?? "";
  } catch {
    raw = "blocked";
  }
  const signature = `${raw}|${memoryVersion}`;
  const cached = snapshots.get(userId);
  if (cached && cached.signature === signature) return cached.drafts;
  const drafts = loadDrafts(userId);
  snapshots.set(userId, { signature, drafts });
  return drafts;
}

export function getServerDraftsSnapshot(): SavedDraft[] {
  return NO_DRAFTS;
}

/** Writes (or replaces) the user's draft for its task + topic. Never throws; does nothing without a user id. */
export function saveDraft(userId: string | null | undefined, draft: SavedDraft): void {
  if (!userId || typeof window === "undefined") return;
  const others = loadDrafts(userId).filter((existing) => existing.key !== draft.key);
  persist(userId, [draft, ...others].slice(0, MAX_SAVED_DRAFTS));
}

/** Removes the user's draft for one task + topic. Never throws. */
export function deleteDraft(userId: string | null | undefined, key: string): void {
  if (!userId || typeof window === "undefined") return;
  const drafts = loadDrafts(userId);
  if (!drafts.some((draft) => draft.key === key)) return;
  persist(userId, drafts.filter((draft) => draft.key !== key));
}

/** Deletes the first version's ownerless store. It is never offered to anyone. */
export function discardLegacyDrafts(): void {
  try {
    window.localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
  } catch {
    // Blocked storage has nothing to delete.
  }
}

/** Test seam: forgets the per-tab copies. */
export function resetDraftMemoryForTest() {
  unpersisted.clear();
  memoryVersion += 1;
  snapshots.clear();
}
