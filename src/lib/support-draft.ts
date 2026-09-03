import { useSyncExternalStore } from "react";

// A learner who steps away mid-draft -- most commonly via the browser's own
// Back button, which unmounts the intercepted /support modal directly
// without going through Modal's close guard (see useModalCloseGuard in
// support-form.tsx) -- must not lose what they typed. Session-scoped, not
// per-account: the form itself has no persisted identity of its own, and a
// signed-out redirect-and-back round trip should not resurrect someone
// else's draft on a shared machine after the tab closes.
//
// An attachment can't be part of that recovery the same way: a File isn't
// JSON-serializable, and sessionStorage has no mechanism for arbitrary
// binary data anyway (unlike IndexedDB, which would be real added
// complexity for what's an optional field). So only the attachment's name
// survives, purely to tell the learner on restore that it did not -- see
// attachmentName below and copy.support.attachmentNotRestored.
const STORAGE_KEY = "support-draft";

export interface SupportDraft {
  category: string;
  details: string;
  // The name of an attachment that was selected when the draft was last
  // written, kept only so the form can tell the learner it wasn't carried
  // over -- see the module comment below on why the file itself never is.
  attachmentName: string | null;
}

export const EMPTY_SUPPORT_DRAFT: SupportDraft = { category: "", details: "", attachmentName: null };

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;
type ClearableStorage = Pick<Storage, "removeItem">;

export function loadSupportDraft(storage: ReadableStorage): SupportDraft | null {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const { category, details, attachmentName } = parsed as Partial<SupportDraft>;
    if (typeof category !== "string" || typeof details !== "string") return null;
    if (attachmentName !== null && attachmentName !== undefined && typeof attachmentName !== "string") return null;

    return { category, details, attachmentName: attachmentName ?? null };
  } catch {
    // A previous, incompatible draft shape (or corrupted storage) is no
    // worse than having no draft at all -- never let it break the form.
    return null;
  }
}

export function saveSupportDraft(storage: WritableStorage, draft: SupportDraft): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export function clearSupportDraft(storage: ClearableStorage): void {
  storage.removeItem(STORAGE_KEY);
}

// sessionStorage is the actual source of truth here, read through
// useSyncExternalStore rather than seeded into local component state from an
// effect: getSnapshot below only reads it after the hydration-safe
// getServerSnapshot has already committed the empty default, so a restored
// draft can safely differ from the server-rendered first paint with no
// hydration mismatch -- and no separate effect body calling setState.
let cachedDraft: SupportDraft = EMPTY_SUPPORT_DRAFT;
let hasReadStoredDraft = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SupportDraft {
  if (!hasReadStoredDraft) {
    hasReadStoredDraft = true;
    const stored = loadSupportDraft(sessionStorage);
    if (stored) cachedDraft = stored;
  }
  return cachedDraft;
}

function getServerSnapshot(): SupportDraft {
  return EMPTY_SUPPORT_DRAFT;
}

/**
 * Restores whatever a learner left mid-draft even if they left through a
 * path the Support modal's own close guard cannot see -- most notably the
 * browser's own Back button, which unmounts the form directly instead of
 * calling requestClose() (see useModalCloseGuard in support-form.tsx).
 */
export function useSupportDraft(): [SupportDraft, (next: SupportDraft) => void] {
  const draft = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function writeDraft(next: SupportDraft) {
    cachedDraft = next;
    if (next.category !== "" || next.details.trim() !== "" || next.attachmentName !== null) {
      saveSupportDraft(sessionStorage, next);
    } else {
      clearSupportDraft(sessionStorage);
    }
    notifyListeners();
  }

  return [draft, writeDraft];
}
