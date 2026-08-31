import { describe, expect, it } from "vitest";
import {
  PRACTICE_EXERCISE_SEQUENCE,
  PRACTICE_EXERCISES,
  PRACTICE_LEVELS,
  PRACTICE_TOPICS,
  getPracticeExercises,
  getPracticeTopic,
  getPracticeTopics,
} from "./practice-curriculum";

describe("practice curriculum", () => {
  it("keeps each task's topic menu specific to its writing purpose", () => {
    expect(getPracticeTopics("TASK_1").map((topic) => topic.id)).toContain("openingS".toLowerCase());
    expect(getPracticeTopics("TASK_1").map((topic) => topic.id)).not.toContain("counterarguments");
    expect(getPracticeTopics("TASK_2").map((topic) => topic.id)).toContain("recounting-events");
    expect(getPracticeTopics("TASK_2").map((topic) => topic.id)).not.toContain("asking-information");
    expect(getPracticeTopics("TASK_3").map((topic) => topic.id)).toContain("counterarguments");
    expect(getPracticeTopics("TASK_3").map((topic) => topic.id)).not.toContain("salutations");
  });

  it("does not offer a topic at a level before manually reviewed exercises exist", () => {
    expect(getPracticeTopics("TASK_1", "B2").map((topic) => topic.id)).toEqual(["openings"]);
    expect(getPracticeTopics("TASK_2", "B2").map((topic) => topic.id)).toEqual(["recounting-events"]);
    expect(getPracticeTopics("TASK_3", "C1").map((topic) => topic.id)).toEqual(["counterarguments"]);
    expect(getPracticeTopics("TASK_2", "C2")).toEqual([]);
  });

  it("provides an explicit learning goal for every topic and target level", () => {
    for (const topic of PRACTICE_TOPICS) {
      for (const level of PRACTICE_LEVELS) {
        expect(topic.learningGoal[level], `${topic.task}/${topic.id}/${level}`).not.toEqual("");
      }
    }
  });

  it("makes every curated sequence progress from recognition to independent production", () => {
    // Derive the paths from the bank rather than carrying a hand-maintained
    // list. A future author cannot accidentally add an incomplete or wrongly
    // ordered task/level/skill path without this test exercising it.
    const selections = new Map(
      PRACTICE_EXERCISES.map((exercise) => [
        `${exercise.task}/${exercise.level}/${exercise.skill}`,
        { task: exercise.task, level: exercise.level, skill: exercise.skill },
      ]),
    );
    expect(selections.size).toBeGreaterThan(0);

    for (const [path, { task, level, skill }] of selections) {
      const exercises = getPracticeExercises(task, level, skill);
      expect(exercises.map((exercise) => exercise.exerciseType), path).toEqual(PRACTICE_EXERCISE_SEQUENCE);
      expect(exercises.map((exercise) => exercise.sequenceOrder)).toEqual([1, 2, 3, 4, 5, 6]);
      expect(exercises[0].prerequisiteExerciseId).toBeNull();
      for (let index = 1; index < exercises.length; index += 1) {
        expect(exercises[index].prerequisiteExerciseId).toBe(exercises[index - 1].id);
      }
    }
  });

  it("stores all exercise content locally with the fields needed to render and assess it", () => {
    for (const entry of PRACTICE_EXERCISES) {
      expect(getPracticeTopic(entry.task, entry.skill), entry.id).toBeDefined();
      expect(entry.prompt.trim(), entry.id).not.toBe("");
      expect(entry.instructions.trim(), entry.id).not.toBe("");
      expect(entry.explanation.trim(), entry.id).not.toBe("");
      expect(entry.targetLanguageFeature.trim(), entry.id).not.toBe("");
      expect(entry.tags.length, entry.id).toBeGreaterThan(0);
      if (entry.exerciseType === "develop" || entry.exerciseType === "produce") {
        expect(entry.correctAnswer, entry.id).toBeNull();
        expect(entry.acceptedAnswers, entry.id).toEqual([]);
        expect(entry.selfCheck, entry.id).toHaveLength(3);
      }
      if (entry.exerciseType === "organize") {
        expect(Array.isArray(entry.correctAnswer), entry.id).toBe(true);
        expect(entry.correctAnswer).toEqual(expect.arrayContaining([...entry.options]));
        expect(entry.options).toHaveLength((entry.correctAnswer as readonly string[]).length);
      }
    }
  });
});
