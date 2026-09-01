import { describe, expect, it } from "vitest";
import { CURRENT_WALKTHROUGH_VERSION, shouldAutoStartWalkthrough } from "./walkthrough";

describe("shouldAutoStartWalkthrough", () => {
  it("auto-starts for a learner who has never completed or skipped it", () => {
    expect(shouldAutoStartWalkthrough(null)).toBe(true);
  });

  it("auto-starts for a learner below the current version", () => {
    expect(shouldAutoStartWalkthrough(CURRENT_WALKTHROUGH_VERSION - 1)).toBe(true);
  });

  it("reintroduces the tour to learners who completed the version before Practice was added", () => {
    expect(CURRENT_WALKTHROUGH_VERSION).toBe(2);
    expect(shouldAutoStartWalkthrough(1)).toBe(true);
  });

  it("does not auto-start for a learner already at the current version", () => {
    expect(shouldAutoStartWalkthrough(CURRENT_WALKTHROUGH_VERSION)).toBe(false);
  });

  it("does not auto-start for a learner above the current version", () => {
    expect(shouldAutoStartWalkthrough(CURRENT_WALKTHROUGH_VERSION + 1)).toBe(false);
  });
});
