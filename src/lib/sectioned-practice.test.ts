import { describe, expect, it } from "vitest";
import {
  PRACTICE_LEVELS,
  PRACTICE_SECTION_BLUEPRINT,
  SECTIONED_PRACTICE_EXERCISES,
  countWords,
  getSectionedPracticeExercise,
  getSectionedPracticeExercises,
} from "./sectioned-practice";

const TASKS = ["TASK_1", "TASK_2", "TASK_3"] as const;

describe("sectioned practice blueprint", () => {
  it("uses the three agreed sections and word ranges for each task", () => {
    const summary = Object.fromEntries(
      TASKS.map((task) => [task, PRACTICE_SECTION_BLUEPRINT[task].map((s) => [s.id, s.minWords, s.maxWords])]),
    );

    expect(summary).toEqual({
      TASK_1: [["t1_opening", 10, 15], ["t1_development", 50, 70], ["t1_closing", 10, 20]],
      TASK_2: [["t2_situation", 20, 30], ["t2_events", 45, 60], ["t2_comment", 40, 55]],
      TASK_3: [["t3_synthesis", 40, 60], ["t3_position", 15, 25], ["t3_arguments", 55, 75]],
    });
  });
});

describe("sectioned practice content", () => {
  it("has exactly one exercise for every task and level", () => {
    for (const task of TASKS) {
      for (const level of PRACTICE_LEVELS) {
        expect(getSectionedPracticeExercises(task, level)).toHaveLength(1);
      }
    }
    expect(SECTIONED_PRACTICE_EXERCISES).toHaveLength(9);
  });

  it("uses unique ids", () => {
    const ids = SECTIONED_PRACTICE_EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SECTIONED_PRACTICE_EXERCISES.map((exercise) => [exercise.id, exercise] as const))(
    "%s: every model answer fits its section's word range, however punctuation is counted",
    (_id, exercise) => {
      const blueprint = PRACTICE_SECTION_BLUEPRINT[exercise.task];
      expect(exercise.modelAnswers).toHaveLength(blueprint.length);

      exercise.modelAnswers.forEach((answer, index) => {
        const { minWords, maxWords, id } = blueprint[index];
        // The app counts whitespace-separated words, so a spaced "?" or ":"
        // is a word. Also check the count without those, so the model stays
        // in range whichever way a learner or the TCF marker counts.
        const withPunctuationTokens = countWords(answer);
        const lettersOnly = answer.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
        expect(withPunctuationTokens, `${id} (all tokens)`).toBeGreaterThanOrEqual(minWords);
        expect(withPunctuationTokens, `${id} (all tokens)`).toBeLessThanOrEqual(maxWords);
        expect(lettersOnly, `${id} (words only)`).toBeGreaterThanOrEqual(minWords);
        expect(lettersOnly, `${id} (words only)`).toBeLessThanOrEqual(maxWords);
      });
    },
  );

  it("gives Tâche 1 required elements and Tâche 3 two documents, and neither elsewhere", () => {
    for (const exercise of SECTIONED_PRACTICE_EXERCISES) {
      expect(Boolean(exercise.requiredElements?.length), exercise.id).toBe(exercise.task === "TASK_1");
      expect(exercise.documents?.length ?? 0, exercise.id).toBe(exercise.task === "TASK_3" ? 2 : 0);
    }
  });

  it("looks exercises up by id", () => {
    expect(getSectionedPracticeExercise("t1-b2-new-flat")?.task).toBe("TASK_1");
    expect(getSectionedPracticeExercise("nope")).toBeNull();
  });
});
