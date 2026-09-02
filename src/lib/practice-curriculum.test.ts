import { describe, expect, it } from "vitest";
import {
  PRACTICE_EXERCISE_SEQUENCE,
  PRACTICE_EXERCISES,
  PRACTICE_LEVELS,
  PRACTICE_TOPICS,
  getPracticeExercises,
  getPracticeHint,
  getPracticeTopic,
  getPracticeTopics,
  hasCompletePracticePath,
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

  it("orders each task's parts by the authored construction of the response", () => {
    for (const task of ["TASK_1", "TASK_2", "TASK_3"] as const) {
      const parts = getPracticeTopics(task);
      expect(parts.map((part) => part.taskPartOrder), task).toEqual(
        Array.from({ length: parts.length }, (_, index) => index + 1),
      );
    }

    // Task 3 must lead learners through source-aware synthesis before their
    // own position, rather than presenting argument practice as the first
    // component of the task.
    expect(getPracticeTopics("TASK_3").map((part) => part.id)).toEqual([
      "introducing-topic",
      "reformulating-sources",
      "identifying-arguments",
      "comparing-viewpoints",
      "synthesizing",
      "taking-position",
      "justifying-position",
      "counterarguments",
      "responding-counterarguments",
      "nuancing-position",
      "conclusion",
    ]);
  });

  it("keeps the authored task-part order when a level has a published subset", () => {
    const taskOneB2Orders = getPracticeTopics("TASK_1", "B2").map((part) => part.taskPartOrder);
    const taskThreeC1Orders = getPracticeTopics("TASK_3", "C1").map((part) => part.taskPartOrder);

    expect(taskOneB2Orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(taskThreeC1Orders).toEqual([7, 8]);
  });

  it("keeps the task blueprint stable across levels and marks unpublished paths explicitly", () => {
    const taskThreeBlueprint = getPracticeTopics("TASK_3").map((part) => part.id);
    expect(taskThreeBlueprint).toContain("introducing-topic");
    expect(taskThreeBlueprint).toContain("taking-position");

    const taskTwoBlueprint = getPracticeTopics("TASK_2").map((part) => part.id);
    expect(taskTwoBlueprint).toContain("describing-experience");
    expect(getPracticeTopics("TASK_2", "B2").map((part) => part.id)).not.toContain("describing-experience");

    expect(hasCompletePracticePath("TASK_1", "B2", "salutations")).toBe(true);
    expect(hasCompletePracticePath("TASK_2", "B2", "describing-experience")).toBe(false);
  });

  it("does not offer a topic at a level before manually reviewed exercises exist", () => {
    expect(getPracticeTopics("TASK_1", "B2").map((topic) => topic.id)).toEqual([
      "salutations",
      "openings",
      "message-purpose",
      "giving-information",
      "developing-information",
      "asking-information",
      "making-requests",
      "suggestions-invitations",
      "register",
      "closing-message",
    ]);
    expect(getPracticeTopics("TASK_1", "C1").map((topic) => topic.id)).toEqual([
      "salutations",
      "openings",
      "message-purpose",
      "giving-information",
      "developing-information",
      "asking-information",
      "making-requests",
      "suggestions-invitations",
      "register",
      "closing-message",
    ]);
    expect(getPracticeTopics("TASK_1", "C2").map((topic) => topic.id)).toEqual([
      "salutations",
      "openings",
      "message-purpose",
      "giving-information",
      "developing-information",
      "asking-information",
      "making-requests",
      "suggestions-invitations",
      "register",
      "closing-message",
    ]);
    expect(getPracticeTopics("TASK_2", "B2").map((topic) => topic.id)).toEqual([
      "format-and-audience",
      "introducing-experience",
      "recounting-events",
      "chronology",
    ]);
    expect(getPracticeTopics("TASK_2", "C1").map((topic) => topic.id)).toEqual(["recounting-events"]);
    expect(getPracticeTopics("TASK_2", "C2").map((topic) => topic.id)).toEqual(["recounting-events"]);
    expect(getPracticeTopics("TASK_3", "C1").map((topic) => topic.id)).toEqual(["justifying-position", "counterarguments"]);
    expect(getPracticeTopics("TASK_3", "C2").map((topic) => topic.id)).toEqual(["justifying-position"]);
  });

  it("provides an explicit learning goal for every topic and target level", () => {
    for (const topic of PRACTICE_TOPICS) {
      for (const level of PRACTICE_LEVELS) {
        expect(topic.learningGoal[level], `${topic.task}/${topic.id}/${level}`).not.toEqual("");
      }
    }
  });

  it("makes every curated topic cover the fixed scaffold and allow reviewed variants per stage", () => {
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
      expect(new Set(exercises.map((exercise) => exercise.exerciseType)), path).toEqual(
        new Set(PRACTICE_EXERCISE_SEQUENCE),
      );
      expect(new Set(exercises.map((exercise) => exercise.sequenceOrder)), path).toEqual(new Set([1, 2, 3, 4, 5, 6]));

      for (const [index, stage] of PRACTICE_EXERCISE_SEQUENCE.entries()) {
        const stageVariants = exercises.filter((exercise) => exercise.sequenceOrder === index + 1);
        expect(stageVariants.length, `${path}/${stage}`).toBeGreaterThanOrEqual(2);
        expect(stageVariants.every((exercise) => exercise.exerciseType === stage), `${path}/${stage}`).toBe(true);
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
        expect(getPracticeHint(entry), entry.id).toBe(entry.hint ?? entry.selfCheck?.[0]);
      }
      if (entry.exerciseType === "organize") {
        expect(Array.isArray(entry.correctAnswer), entry.id).toBe(true);
        expect(entry.correctAnswer).toEqual(expect.arrayContaining([...entry.options]));
        expect(entry.options).toHaveLength((entry.correctAnswer as readonly string[]).length);
      }
    }
  });

  it("keeps each authored exercise identifier unique", () => {
    const ids = PRACTICE_EXERCISES.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
