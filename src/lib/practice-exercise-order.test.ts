import { describe, expect, it } from "vitest";
import { selectPracticeExerciseSession } from "./practice-exercise-order";
import { PRACTICE_SESSION_STAGES } from "./practice-session-stages";

describe("selectPracticeExerciseSession", () => {
  it("exposes only the session stages, in their fixed order, regardless of input order", () => {
    const authoredExercises = [
      { exercise_type: "produce", id: "produce-1" },
      { exercise_type: "recognize", id: "recognize-1" },
      { exercise_type: "organize", id: "organize-1" },
      { exercise_type: "complete", id: "complete-1" },
      { exercise_type: "develop", id: "develop-1" },
      { exercise_type: "transform", id: "transform-1" },
    ];

    const session = selectPracticeExerciseSession(authoredExercises, () => 0);

    expect(session.map((exercise) => exercise.exercise_type)).toEqual([...PRACTICE_SESSION_STAGES]);
    expect(session.map((exercise) => exercise.id)).toEqual(["recognize-1", "develop-1", "produce-1"]);
    expect(authoredExercises[0]).toEqual({ exercise_type: "produce", id: "produce-1" });
  });

  it("follows an explicitly chosen stage sequence instead of the default", () => {
    const authoredExercises = [
      { exercise_type: "produce", id: "produce-1" },
      { exercise_type: "organize", id: "organize-1" },
      { exercise_type: "recognize", id: "recognize-1" },
    ];

    const session = selectPracticeExerciseSession(authoredExercises, () => 0, new Set(), ["organize", "produce"]);

    expect(session.map((exercise) => exercise.id)).toEqual(["organize-1", "produce-1"]);
  });

  it("picks among several reviewed variants for the same stage without changing the stage order", () => {
    const authoredExercises = [
      { exercise_type: "recognize", id: "recognize-a" },
      { exercise_type: "recognize", id: "recognize-b" },
      { exercise_type: "develop", id: "develop-a" },
    ];

    const session = selectPracticeExerciseSession(authoredExercises, () => 0.99);

    expect(session.map((exercise) => exercise.id)).toEqual(["recognize-b", "develop-a"]);
  });

  it("uses another reviewed variant on replay when one exists", () => {
    const authoredExercises = [
      { exercise_type: "recognize", id: "recognize-a" },
      { exercise_type: "recognize", id: "recognize-b" },
      { exercise_type: "develop", id: "develop-a" },
    ];

    const session = selectPracticeExerciseSession(authoredExercises, () => 0, new Set(["recognize-a", "develop-a"]));

    expect(session.map((exercise) => exercise.id)).toEqual(["recognize-b", "develop-a"]);
  });

  it("omits a stage entirely when no exercise is authored for it", () => {
    const authoredExercises = [{ exercise_type: "recognize", id: "recognize-1" }];

    expect(selectPracticeExerciseSession(authoredExercises, () => 0)).toEqual(authoredExercises);
  });
});
