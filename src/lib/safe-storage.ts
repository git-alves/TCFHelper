// localStorage can be blocked (a browser setting, some private modes, an
// embedded view), where even reading the `localStorage` property throws, or
// full, where writing throws. Storage here is only ever a convenience, so
// these helpers turn every such failure into "nothing stored" instead of an
// error that takes the page down.

/** The stored value, or null when it is absent or storage cannot be read. */
export function safeGetLocalItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Whether the value was stored; false when storage is blocked or full. */
export function safeSetLocalItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** A storage whose every method swallows a failure: reads give null, writes and removals do nothing. */
export function getSafeLocalStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  return {
    getItem: safeGetLocalItem,
    setItem: (key, value) => void safeSetLocalItem(key, value),
    removeItem: (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Nothing stored, nothing to remove.
      }
    },
  };
}
