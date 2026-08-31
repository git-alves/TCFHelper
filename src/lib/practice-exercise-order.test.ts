import { describe, expect, it } from "vitest";
import { randomizePracticeExerciseOrder } from "./practice-exercise-order";

describe("randomizePracticeExerciseOrder", () => {
  it("varies the presentation order without changing the authored exercise set", () => {
    const authoredExercises = ["recognize", "complete", "transform", "organize"];

    const randomized = randomizePracticeExerciseOrder(authoredExercises, () => 0);

    expect(randomized).toEqual(["complete", "transform", "organize", "recognize"]);
    expect(authoredExercises).toEqual(["recognize", "complete", "transform", "organize"]);
    expect(randomized).toHaveLength(authoredExercises.length);
    expect([...randomized].sort()).toEqual([...authoredExercises].sort());
  });

  it("leaves a one-exercise set intact", () => {
    expect(randomizePracticeExerciseOrder(["produce"], () => 0)).toEqual(["produce"]);
  });
});
