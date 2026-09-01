import { describe, expect, it } from "vitest";
import {
  markContextualWalkthroughSeen,
  shouldShowContextualWalkthrough,
  type ContextualWalkthroughPage,
} from "./contextual-walkthrough";

function createStorage(): Pick<Storage, "getItem" | "setItem"> {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

describe("contextual walkthrough state", () => {
  it.each(["practice", "tasks"] as const)("shows the %s guide until it is dismissed", (page: ContextualWalkthroughPage) => {
    const storage = createStorage();

    expect(shouldShowContextualWalkthrough(storage, page)).toBe(true);

    markContextualWalkthroughSeen(storage, page);

    expect(shouldShowContextualWalkthrough(storage, page)).toBe(false);
  });

  it("keeps the two page guides independent", () => {
    const storage = createStorage();

    markContextualWalkthroughSeen(storage, "practice");

    expect(shouldShowContextualWalkthrough(storage, "practice")).toBe(false);
    expect(shouldShowContextualWalkthrough(storage, "tasks")).toBe(true);
  });
});
