// Test helpers: swap window.localStorage for a stand-in and return a restore
// function. Replacing the property is more reliable under happy-dom than
// spying on the live Storage object.

export interface StorageCalls {
  getItem: number;
  setItem: number;
}

/** A storage whose reads and/or writes throw, for every key; otherwise an in-memory map. */
export function installFakeLocalStorage(behaviour: {
  failReads?: boolean;
  failWrites?: boolean | ((writeNumber: number) => boolean);
}): { calls: StorageCalls; contents: Map<string, string>; restore: () => void } {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  const contents = new Map<string, string>();
  const calls: StorageCalls = { getItem: 0, setItem: 0 };
  const fake = {
    getItem(key: string) {
      calls.getItem += 1;
      if (behaviour.failReads) throw new DOMException("blocked", "SecurityError");
      return contents.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      calls.setItem += 1;
      const fails =
        typeof behaviour.failWrites === "function" ? behaviour.failWrites(calls.setItem) : behaviour.failWrites;
      if (fails) throw new DOMException("full", "QuotaExceededError");
      contents.set(key, value);
    },
    removeItem(key: string) {
      if (behaviour.failWrites) throw new DOMException("blocked", "SecurityError");
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

/** A browser where merely touching window.localStorage throws, as some do when storage is blocked. */
export function installUnreachableLocalStorage(): { accesses: () => number; restore: () => void } {
  const original = Object.getOwnPropertyDescriptor(window, "localStorage");
  let accesses = 0;
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      accesses += 1;
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  return {
    accesses: () => accesses,
    restore: () => {
      if (original) Object.defineProperty(window, "localStorage", original);
    },
  };
}
