import { beforeEach, describe, expect, it, vi } from "vitest";
import { PracticeCompletionMethod } from "@prisma/client";
import { getPracticeExercises } from "@/lib/practice-curriculum";
import { PRACTICE_SESSION_STAGES } from "@/lib/practice-session-stages";

vi.mock("server-only", () => ({}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    practiceSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    practiceExerciseCompletion: {
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { clearPracticeProgress, createPracticeSession, getPracticeProgressSummary, recordPracticeCompletion } =
  await import("./practice-progress");

const USER_ID = "learner_1";
const authoredExerciseOfType = (exerciseType: string) => {
  const exercise = getPracticeExercises("TASK_1", "B2", "salutations").find(
    (candidate) => candidate.exerciseType === exerciseType,
  );
  if (!exercise) throw new Error(`Missing ${exerciseType} test exercise.`);
  return exercise;
};
const EXERCISES = PRACTICE_SESSION_STAGES.map(authoredExerciseOfType);
const SESSION_INPUT = {
  task: "TASK_1" as const,
  level: "B2" as const,
  skillId: "salutations",
  exerciseIds: EXERCISES.map((exercise) => exercise.id),
};

beforeEach(() => {
  prismaMock.practiceSession.create.mockReset();
  prismaMock.practiceSession.findFirst.mockReset();
  prismaMock.practiceSession.findMany.mockReset();
  prismaMock.practiceSession.deleteMany.mockReset();
  prismaMock.practiceExerciseCompletion.groupBy.mockReset();
  prismaMock.$transaction.mockReset();
});

describe("createPracticeSession", () => {
  it("accepts only the reviewed session sequence selected from the question bank", async () => {
    prismaMock.practiceSession.create.mockResolvedValue({ id: "session_1" });

    await expect(createPracticeSession(USER_ID, SESSION_INPUT)).resolves.toEqual({ id: "session_1" });
    expect(prismaMock.practiceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          taskType: "TASK_1",
          targetLevel: "B2",
          skillId: "salutations",
          exerciseIds: SESSION_INPUT.exerciseIds,
        }),
      }),
    );
  });

  it("rejects a reordered or invented exercise list before writing a session", async () => {
    await expect(
      createPracticeSession(USER_ID, {
        ...SESSION_INPUT,
        exerciseIds: [...SESSION_INPUT.exerciseIds].reverse(),
      }),
    ).resolves.toBeNull();
    await expect(
      createPracticeSession(USER_ID, {
        ...SESSION_INPUT,
        exerciseIds: [...SESSION_INPUT.exerciseIds.slice(0, -1), "invented"],
      }),
    ).resolves.toBeNull();

    expect(prismaMock.practiceSession.create).not.toHaveBeenCalled();
  });

  it("rejects the retired six-exercise sequence for a new session", async () => {
    const retiredSequence = ["recognize", "complete", "transform", "organize", "develop", "produce"].map(
      (exerciseType) => authoredExerciseOfType(exerciseType).id,
    );

    await expect(createPracticeSession(USER_ID, { ...SESSION_INPUT, exerciseIds: retiredSequence })).resolves.toBeNull();
    expect(prismaMock.practiceSession.create).not.toHaveBeenCalled();
  });
});

describe("recordPracticeCompletion", () => {
  it("records the original result once and marks a session complete once every exercise is recorded", async () => {
    prismaMock.practiceSession.findFirst.mockResolvedValue({
      id: "session_1",
      taskType: "TASK_1",
      targetLevel: "B2",
      skillId: "salutations",
      exerciseIds: SESSION_INPUT.exerciseIds,
    });
    const tx = {
      practiceExerciseCompletion: {
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(EXERCISES.length),
      },
      practiceSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    prismaMock.$transaction.mockImplementation((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));

    await expect(
      recordPracticeCompletion(USER_ID, "session_1", SESSION_INPUT.exerciseIds[0], "correct"),
    ).resolves.toEqual({ kind: "recorded", sequenceCompleted: true });
    expect(tx.practiceExerciseCompletion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {},
        create: expect.objectContaining({ completionMethod: PracticeCompletionMethod.CORRECT }),
      }),
    );
    expect(tx.practiceSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "session_1", completedAt: null } }),
    );
  });

  it("keeps a session created with the retired six-exercise sequence completable", async () => {
    const retiredSequence = ["recognize", "complete", "transform", "organize", "develop", "produce"].map(
      (exerciseType) => authoredExerciseOfType(exerciseType).id,
    );
    prismaMock.practiceSession.findFirst.mockResolvedValue({
      id: "session_old",
      taskType: "TASK_1",
      targetLevel: "B2",
      skillId: "salutations",
      exerciseIds: retiredSequence,
    });
    const tx = {
      practiceExerciseCompletion: {
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(3),
      },
      practiceSession: { updateMany: vi.fn() },
    };
    prismaMock.$transaction.mockImplementation((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));

    await expect(recordPracticeCompletion(USER_ID, "session_old", retiredSequence[0], "correct")).resolves.toEqual({
      kind: "recorded",
      sequenceCompleted: false,
    });
    expect(tx.practiceSession.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a completion method that cannot apply to the exercise stage", async () => {
    prismaMock.practiceSession.findFirst.mockResolvedValue({
      id: "session_1",
      taskType: "TASK_1",
      targetLevel: "B2",
      skillId: "salutations",
      exerciseIds: SESSION_INPUT.exerciseIds,
    });

    await expect(
      recordPracticeCompletion(USER_ID, "session_1", SESSION_INPUT.exerciseIds[0], "self-review"),
    ).resolves.toEqual({ kind: "invalid" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("getPracticeProgressSummary", () => {
  it("separates assisted answer reveals from independent practice", async () => {
    prismaMock.practiceExerciseCompletion.groupBy.mockResolvedValue([
      { completionMethod: PracticeCompletionMethod.CORRECT, _count: { _all: 12 } },
      { completionMethod: PracticeCompletionMethod.SELF_REVIEW, _count: { _all: 2 } },
      { completionMethod: PracticeCompletionMethod.REVEALED, _count: { _all: 4 } },
    ]);
    prismaMock.practiceSession.findMany.mockResolvedValue([{ id: "one" }, { id: "two" }, { id: "three" }]);

    await expect(getPracticeProgressSummary(USER_ID)).resolves.toEqual({
      completedExercises: 18,
      completedIndependently: 14,
      completedWithHelp: 4,
      completedTaskParts: 3,
    });
  });
});

describe("clearPracticeProgress", () => {
  it("deletes only this learner's practice sessions", async () => {
    prismaMock.practiceSession.deleteMany.mockResolvedValue({ count: 3 });

    await clearPracticeProgress(USER_ID);

    expect(prismaMock.practiceSession.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
  });
});
