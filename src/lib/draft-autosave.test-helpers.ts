// Test helper: swaps window.localStorage for a stand-in and returns a restore
// function. Replacing the property is more reliable under happy-dom than
// spying on the live Storage object.

export interface StorageCalls {
  getItem: number;
  setItem: number;
}

/**
 * A storage whose reads and/or writes of `onlyKey` (the drafts by default)
 * throw; everything else works on an in-memory map. Scoped to the drafts key
 * because other code in the app reads localStorage without a guard.
 */
export function installFakeLocalStorage(behaviour: {
  onlyKey?: string;
  failReads?: boolean;
  failWrites?: boolean | ((writeNumber: number) => boolean);
}): { calls: StorageCalls; contents: Map<string, string>; restore: () => void } {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  const contents = new Map<string, string>();
  const calls: StorageCalls = { getItem: 0, setItem: 0 };
  const fake = {
    getItem(key: string) {
      if (key !== (behaviour.onlyKey ?? "mytcflab:drafts")) return contents.get(key) ?? null;
      calls.getItem += 1;
      if (behaviour.failReads) throw new DOMException("blocked", "SecurityError");
      return contents.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (key !== (behaviour.onlyKey ?? "mytcflab:drafts")) {
        contents.set(key, value);
        return;
      }
      calls.setItem += 1;
      const fails =
        typeof behaviour.failWrites === "function" ? behaviour.failWrites(calls.setItem) : behaviour.failWrites;
      if (fails) throw new DOMException("full", "QuotaExceededError");
      contents.set(key, value);
    },
    removeItem(key: string) {
      contents.delete(key);
    },
    clear() {
      contents.clear();
    },
  };
  Object.defineProperty(window, "localStorage", { configurable: true, value: fake });
  return {
    calls,
    contents,
    restore: () => {
      if (original) Object.defineProperty(window, "localStorage", original);
    },
  };
}
