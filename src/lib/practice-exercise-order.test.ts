import { describe, expect, it } from "vitest";
import { selectPracticeExerciseSession } from "./practice-exercise-order";

describe("selectPracticeExerciseSession", () => {
  it("always presents the six stages in the fixed scaffold order, regardless of input order", () => {
    const authoredExercises = [
      { exercise_type: "produce", id: "produce-1" },
      { exercise_type: "recognize", id: "recognize-1" },
      { exercise_type: "organize", id: "organize-1" },
      { exercise_type: "complete", id: "complete-1" },
      { exercise_type: "develop", id: "develop-1" },
      { exercise_type: "transform", id: "transform-1" },
    ];

    const session = selectPracticeExerciseSession(authoredExercises, () => 0);

    expect(session.map((exercise) => exercise.exercise_type)).toEqual([
      "recognize",
      "complete",
      "transform",
      "organize",
      "develop",
      "produce",
    ]);
    expect(authoredExercises[0]).toEqual({ exercise_type: "produce", id: "produce-1" });
  });

  it("picks among several reviewed variants for the same stage without changing the stage order", () => {
    const authoredExercises = [
      { exercise_type: "recognize", id: "recognize-a" },
      { exercise_type: "recognize", id: "recognize-b" },
      { exercise_type: "complete", id: "complete-a" },
    ];

    const session = selectPracticeExerciseSession(authoredExercises, () => 0.99);

    expect(session.map((exercise) => exercise.id)).toEqual(["recognize-b", "complete-a"]);
  });

  it("omits a stage entirely when no exercise is authored for it", () => {
    const authoredExercises = [{ exercise_type: "recognize", id: "recognize-1" }];

    expect(selectPracticeExerciseSession(authoredExercises, () => 0)).toEqual(authoredExercises);
  });
});
