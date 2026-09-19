import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/components/app-locale-provider", async () => {
  const { getAppCopy } = await import("@/lib/app-copy");
  return {
    useAppLocale: () => ({ locale: "en", setLocale: () => {} }),
    useAppCopy: () => getAppCopy("en"),
  };
});

const { PracticeTrainer, scrambleOrdering } = await import("./practice-trainer");

describe("PracticeTrainer initial render", () => {
  it("renders without crashing before any task/level/topic is selected", () => {
    expect(() =>
      renderToStaticMarkup(<PracticeTrainer curriculum={{ skills: [], exercises: [] }} />),
    ).not.toThrow();
  });

  it("shows the three setup steps as numbered badges, not a baked-in digit prefix", () => {
    const markup = renderToStaticMarkup(<PracticeTrainer curriculum={{ skills: [], exercises: [] }} />);

    // The visible label no longer starts with "1. "/"2. "/"3. " -- that's
    // now a separate badge -- while the step order is still announced to
    // assistive tech via the visually-hidden "Step N:" prefix.
    expect(markup).toContain("Which task would you like to improve?");
    expect(markup).not.toContain("1. Which task");
    expect(markup).toContain("Step 1: ");
    expect(markup).toContain("Step 2: ");
    expect(markup).toContain("Step 3: ");
  });
});

describe("scrambleOrdering", () => {
  it("never leaves an already-correctly-ordered exercise pre-solved", () => {
    const correctAnswer = ["First sentence.", "Second sentence.", "Third sentence.", "Fourth sentence."];
    for (let trial = 0; trial < 200; trial += 1) {
      const result = scrambleOrdering(correctAnswer, correctAnswer);
      expect(result).not.toEqual(correctAnswer);
    }
  });

  it("keeps every original item, just reordered", () => {
    const options = ["A", "B", "C", "D", "E"];
    const correctAnswer = ["E", "D", "C", "B", "A"];
    const result = scrambleOrdering(options, correctAnswer);
    expect([...result].sort()).toEqual([...options].sort());
  });
});
