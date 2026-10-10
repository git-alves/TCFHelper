import { describe, expect, it } from "vitest";
import {
  PRACTICE_EXERCISES,
  PRACTICE_LEVELS,
  PRACTICE_TOPICS,
  getPracticeExercises,
  getPracticeHint,
  getPracticeTopic,
  getPracticeTopics,
  hasCompletePracticePath,
} from "./practice-curriculum";
import { PRACTICE_SESSION_STAGES } from "./practice-session-stages";

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

  it("keeps the authored task-part order at every level, not the declaration order in the bank", () => {
    // Full coverage now means every level publishes every part of its task,
    // so this no longer exercises a partially published level -- it still
    // guards against order coming from file position instead of
    // taskPartOrder, which is what actually matters to learners.
    const taskOneB2Orders = getPracticeTopics("TASK_1", "B2").map((part) => part.taskPartOrder);
    const taskThreeC2Orders = getPracticeTopics("TASK_3", "C2").map((part) => part.taskPartOrder);

    expect(taskOneB2Orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(taskThreeC2Orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("keeps the task blueprint stable across levels and marks unpublished paths explicitly", () => {
    const taskThreeBlueprint = getPracticeTopics("TASK_3").map((part) => part.id);
    expect(taskThreeBlueprint).toContain("introducing-topic");
    expect(taskThreeBlueprint).toContain("taking-position");

    const taskTwoBlueprint = getPracticeTopics("TASK_2").map((part) => part.id);
    expect(taskTwoBlueprint).toContain("giving-examples");

    expect(hasCompletePracticePath("TASK_1", "B2", "salutations")).toBe(true);
    expect(hasCompletePracticePath("TASK_3", "B2", "introducing-topic")).toBe(true);
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
      "describing-experience",
      "expressing-reaction",
      "commenting-on-experience",
      "giving-examples",
      "adding-details",
      "contrasting-expectations",
      "conclusion",
    ]);
    expect(getPracticeTopics("TASK_2", "C1").map((topic) => topic.id)).toEqual([
      "format-and-audience",
      "introducing-experience",
      "recounting-events",
      "chronology",
      "describing-experience",
      "expressing-reaction",
      "commenting-on-experience",
      "giving-examples",
      "adding-details",
      "contrasting-expectations",
      "conclusion",
    ]);
    expect(getPracticeTopics("TASK_2", "C2").map((topic) => topic.id)).toEqual([
      "format-and-audience",
      "introducing-experience",
      "recounting-events",
      "chronology",
      "describing-experience",
      "expressing-reaction",
      "commenting-on-experience",
      "giving-examples",
      "adding-details",
      "contrasting-expectations",
      "conclusion",
    ]);
    expect(getPracticeTopics("TASK_3", "B2").map((topic) => topic.id)).toEqual([
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
    expect(getPracticeTopics("TASK_3", "C1").map((topic) => topic.id)).toEqual([
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
    expect(getPracticeTopics("TASK_3", "C2").map((topic) => topic.id)).toEqual([
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

  it("provides an explicit learning goal for every topic and target level", () => {
    for (const topic of PRACTICE_TOPICS) {
      for (const level of PRACTICE_LEVELS) {
        expect(topic.learningGoal[level], `${topic.task}/${topic.id}/${level}`).not.toEqual("");
      }
    }
  });

  it("makes every curated topic cover each session stage and allow reviewed variants per stage", () => {
    // Derive the paths from the bank rather than carrying a hand-maintained
    // list. Only the session stages are required: exercises authored for the
    // other stages stay in the bank but never gate a path's availability.
    const selections = new Map(
      PRACTICE_EXERCISES.map((exercise) => [
        `${exercise.task}/${exercise.level}/${exercise.skill}`,
        { task: exercise.task, level: exercise.level, skill: exercise.skill },
      ]),
    );
    expect(selections.size).toBeGreaterThan(0);

    for (const [path, { task, level, skill }] of selections) {
      const exercises = getPracticeExercises(task, level, skill);
      expect(hasCompletePracticePath(task, level, skill), path).toBe(true);

      for (const stage of PRACTICE_SESSION_STAGES) {
        const stageVariants = exercises.filter((exercise) => exercise.exerciseType === stage);
        expect(stageVariants.length, `${path}/${stage}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("keeps the unused authored stages in the bank instead of deleting them", () => {
    const unusedStages = ["complete", "transform", "organize"] as const;
    for (const stage of unusedStages) {
      expect(PRACTICE_SESSION_STAGES).not.toContain(stage);
      expect(PRACTICE_EXERCISES.some((exercise) => exercise.exerciseType === stage), stage).toBe(true);
    }
  });

  it("keeps each authored stage's variants on one stage type and sequence slot", () => {
    const slotTypes = new Map<string, Set<string>>();
    for (const exercise of PRACTICE_EXERCISES) {
      const key = `${exercise.task}/${exercise.level}/${exercise.skill}/${exercise.sequenceOrder}`;
      slotTypes.set(key, (slotTypes.get(key) ?? new Set()).add(exercise.exerciseType));
    }
    for (const [slot, types] of slotTypes) {
      expect(types.size, slot).toBe(1);
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
