import { beforeEach, describe, expect, it, vi } from "vitest";
import { PracticeCompletionMethod } from "@prisma/client";

vi.mock("server-only", () => ({}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    practiceSession: {
      create: vi.fn(),
      findFirst: vi.fn(),
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
const EXERCISE_ID = "t1-b2-new-flat";
const SESSION_INPUT = { task: "TASK_1" as const, level: "B2" as const, exerciseId: EXERCISE_ID };

beforeEach(() => {
  prismaMock.practiceSession.create.mockReset();
  prismaMock.practiceSession.findFirst.mockReset();
  prismaMock.practiceSession.deleteMany.mockReset();
  prismaMock.practiceExerciseCompletion.groupBy.mockReset();
  prismaMock.$transaction.mockReset();
});

describe("createPracticeSession", () => {
  it("stores a session for a reviewed exercise at its own task and level", async () => {
    prismaMock.practiceSession.create.mockResolvedValue({ id: "session_1" });

    await expect(createPracticeSession(USER_ID, SESSION_INPUT)).resolves.toEqual({ id: "session_1" });
    expect(prismaMock.practiceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          taskType: "TASK_1",
          targetLevel: "B2",
          skillId: "sectioned",
          exerciseIds: [EXERCISE_ID],
        }),
      }),
    );
  });

  it.each([
    ["an invented exercise", { ...SESSION_INPUT, exerciseId: "invented" }],
    ["an exercise from another task", { ...SESSION_INPUT, task: "TASK_2" as const }],
    ["an exercise from another level", { ...SESSION_INPUT, level: "C1" as const }],
  ])("rejects %s before writing a session", async (_name, input) => {
    await expect(createPracticeSession(USER_ID, input)).resolves.toBeNull();
    expect(prismaMock.practiceSession.create).not.toHaveBeenCalled();
  });
});

describe("recordPracticeCompletion", () => {
  function mockTransaction(count: number) {
    const tx = {
      practiceExerciseCompletion: {
        upsert: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(count),
      },
      practiceSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    prismaMock.$transaction.mockImplementation((callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx));
    return tx;
  }

  const ownedSession = { id: "session_1", skillId: "sectioned", exerciseIds: [EXERCISE_ID] };

  it("records the original result once and marks the session complete", async () => {
    prismaMock.practiceSession.findFirst.mockResolvedValue(ownedSession);
    const tx = mockTransaction(1);

    await expect(recordPracticeCompletion(USER_ID, "session_1", EXERCISE_ID, "self-review")).resolves.toEqual({
      kind: "recorded",
      sequenceCompleted: true,
    });
    expect(prismaMock.practiceSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "session_1", userId: USER_ID } }),
    );
    expect(tx.practiceExerciseCompletion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {},
        create: expect.objectContaining({ completionMethod: PracticeCompletionMethod.SELF_REVIEW }),
      }),
    );
    expect(tx.practiceSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "session_1", completedAt: null } }),
    );
  });

  it("records a revealed answer as assisted practice", async () => {
    prismaMock.practiceSession.findFirst.mockResolvedValue(ownedSession);
    const tx = mockTransaction(1);

    await recordPracticeCompletion(USER_ID, "session_1", EXERCISE_ID, "revealed");

    expect(tx.practiceExerciseCompletion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ completionMethod: PracticeCompletionMethod.REVEALED }) }),
    );
  });

  it("reports not-found for a session the learner does not own", async () => {
    prismaMock.practiceSession.findFirst.mockResolvedValue(null);

    await expect(recordPracticeCompletion(USER_ID, "someone_elses", EXERCISE_ID, "self-review")).resolves.toEqual({
      kind: "not-found",
    });
  });

  it.each([
    ["an exercise outside the session", { ...ownedSession, exerciseIds: ["other"] }],
    ["a session from the earlier part-by-part trainer", { ...ownedSession, skillId: "salutations" }],
  ])("rejects %s without writing", async (_name, session) => {
    prismaMock.practiceSession.findFirst.mockResolvedValue(session);

    await expect(recordPracticeCompletion(USER_ID, "session_1", EXERCISE_ID, "self-review")).resolves.toEqual({
      kind: "invalid",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("getPracticeProgressSummary", () => {
  it("separates assisted answer reveals from independent practice, counting earlier correct answers too", async () => {
    prismaMock.practiceExerciseCompletion.groupBy.mockResolvedValue([
      { completionMethod: PracticeCompletionMethod.CORRECT, _count: { _all: 12 } },
      { completionMethod: PracticeCompletionMethod.SELF_REVIEW, _count: { _all: 2 } },
      { completionMethod: PracticeCompletionMethod.REVEALED, _count: { _all: 4 } },
    ]);

    await expect(getPracticeProgressSummary(USER_ID)).resolves.toEqual({
      completedExercises: 18,
      completedIndependently: 14,
      completedWithHelp: 4,
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
