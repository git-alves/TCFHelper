import { useCallback, useSyncExternalStore } from "react";

// A learner who steps away mid-draft -- most commonly via the browser's own
// Back button, which unmounts the intercepted /support modal directly
// without going through Modal's close guard (see useModalCloseGuard in
// support-form.tsx) -- must not lose what they typed. Session-scoped, not
// indefinitely persisted: a signed-out redirect-and-back round trip should
// not resurrect a draft on a shared machine after the tab eventually closes.
//
// Every key is namespaced by the signed-in account (see useSupportDraft's
// userKey) rather than one fixed key: without that, a second learner who
// signs in without closing the tab would see -- and could submit -- the
// previous account's still-unsent text under their own "Send as" identity.
//
// An attachment can't be part of that recovery the same way: a File isn't
// JSON-serializable, and sessionStorage has no mechanism for arbitrary
// binary data anyway (unlike IndexedDB, which would be real added
// complexity for what's an optional field). So only the attachment's name
// survives, purely to tell the learner on restore that it did not -- see
// attachmentName below and copy.support.attachmentNotRestored.
const STORAGE_KEY_PREFIX = "support-draft:";

export interface SupportDraft {
  category: string;
  details: string;
  // The name of an attachment that was selected when the draft was last
  // written, kept only so the form can tell the learner it wasn't carried
  // over -- see the module comment above on why the file itself never is.
  attachmentName: string | null;
}

export const EMPTY_SUPPORT_DRAFT: SupportDraft = { category: "", details: "", attachmentName: null };

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;
type ClearableStorage = Pick<Storage, "removeItem">;

// sessionStorage access itself -- not just parsing what it returns -- can
// throw: private-browsing modes, storage disabled by policy, or a full
// quota have all done this in real browsers. None of that is a reason a
// learner should be unable to type into the form, so every entry point here
// degrades to "no persistence this attempt" instead of propagating.
export function loadSupportDraft(storage: ReadableStorage, key: string): SupportDraft | null {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return null;
  }
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

export function saveSupportDraft(storage: WritableStorage, key: string, draft: SupportDraft): void {
  try {
    storage.setItem(key, JSON.stringify(draft));
  } catch {
    // Best-effort: the in-memory cache below (not this call succeeding) is
    // what actually backs the form, so a blocked or full store only costs
    // draft recovery, never the ability to keep typing.
  }
}

export function clearSupportDraft(storage: ClearableStorage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // See saveSupportDraft.
  }
}

// sessionStorage is the actual source of truth here, read through
// useSyncExternalStore rather than seeded into local component state from an
// effect: getSnapshot below only reads it after the hydration-safe
// getServerSnapshot has already committed the empty default, so a restored
// draft can safely differ from the server-rendered first paint with no
// hydration mismatch -- and no separate effect body calling setState.
//
// Both maps are keyed by the namespaced storage key (one entry per signed-in
// account), so switching accounts -- which always remounts this hook with a
// different userKey, since an account switch is a full sign-out/sign-in
// navigation -- reads and writes a completely separate slot rather than
// reusing the previous account's cached value.
const draftCache = new Map<string, SupportDraft>();
const hasReadFromStorage = new Set<string>();
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(storageKey: string): SupportDraft {
  if (!hasReadFromStorage.has(storageKey)) {
    hasReadFromStorage.add(storageKey);
    const stored = loadSupportDraft(sessionStorage, storageKey);
    if (stored) draftCache.set(storageKey, stored);
  }
  return draftCache.get(storageKey) ?? EMPTY_SUPPORT_DRAFT;
}

function getServerSnapshot(): SupportDraft {
  return EMPTY_SUPPORT_DRAFT;
}

/**
 * Restores whatever a learner left mid-draft even if they left through a
 * path the Support modal's own close guard cannot see -- most notably the
 * browser's own Back button, which unmounts the form directly instead of
 * calling requestClose() (see useModalCloseGuard in support-form.tsx).
 *
 * userKey must be a stable per-account identifier -- SupportForm passes the
 * signed-in email -- so a draft never leaks between two different accounts
 * signed into the same browser tab.
 */
export function useSupportDraft(userKey: string): [SupportDraft, (next: SupportDraft) => void] {
  const storageKey = `${STORAGE_KEY_PREFIX}${userKey}`;

  const draft = useSyncExternalStore(
    subscribe,
    useCallback(() => getSnapshot(storageKey), [storageKey]),
    getServerSnapshot,
  );

  const writeDraft = useCallback(
    (next: SupportDraft) => {
      draftCache.set(storageKey, next);
      if (next.category !== "" || next.details.trim() !== "" || next.attachmentName !== null) {
        saveSupportDraft(sessionStorage, storageKey, next);
      } else {
        clearSupportDraft(sessionStorage, storageKey);
      }
      notifyListeners();
    },
    [storageKey],
  );

  return [draft, writeDraft];
}
