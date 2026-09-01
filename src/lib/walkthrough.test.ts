import { describe, expect, it } from "vitest";
import {
  CURRENT_WALKTHROUGH_VERSION,
  FULL_WALKTHROUGH_VALUE,
  isFullWalkthrough,
  shouldAutoStartWalkthrough,
} from "./walkthrough";

describe("shouldAutoStartWalkthrough", () => {
  it("auto-starts for a learner who has never completed or skipped it", () => {
    expect(shouldAutoStartWalkthrough(null)).toBe(true);
  });

  it("auto-starts for a learner below the current version", () => {
    expect(shouldAutoStartWalkthrough(CURRENT_WALKTHROUGH_VERSION - 1)).toBe(true);
  });

  it("reintroduces the full cross-page tour after it changes", () => {
    expect(shouldAutoStartWalkthrough(CURRENT_WALKTHROUGH_VERSION - 1)).toBe(true);
  });

  it("does not auto-start for a learner already at the current version", () => {
    expect(shouldAutoStartWalkthrough(CURRENT_WALKTHROUGH_VERSION)).toBe(false);
  });

  it("does not auto-start for a learner above the current version", () => {
    expect(shouldAutoStartWalkthrough(CURRENT_WALKTHROUGH_VERSION + 1)).toBe(false);
  });

  it("recognizes only the explicit full-tour handoff", () => {
    expect(isFullWalkthrough(FULL_WALKTHROUGH_VALUE)).toBe(true);
    expect(isFullWalkthrough(null)).toBe(false);
    expect(isFullWalkthrough("continue")).toBe(false);
  });
});
