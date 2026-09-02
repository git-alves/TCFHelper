import "server-only";

import { PracticeCompletionMethod, type PracticeLevel as DatabasePracticeLevel, type TaskType } from "@prisma/client";
import {
  PRACTICE_EXERCISE_SEQUENCE,
  getPracticeExercises,
  getPracticeTopic,
  hasCompletePracticePath,
  type PracticeExercise,
  type PracticeLevel,
} from "@/lib/practice-curriculum";
import { prisma } from "@/lib/prisma";

export type PracticeCompletionMethodInput = "correct" | "self-review" | "revealed";

export interface PracticeSessionInput {
  task: TaskType;
  level: PracticeLevel;
  skillId: string;
  exerciseIds: readonly string[];
}

export interface PracticeProgressSummary {
  completedExercises: number;
  completedIndependently: number;
  completedWithHelp: number;
  completedTaskParts: number;
}

const COMPLETION_METHODS: Readonly<Record<PracticeCompletionMethodInput, PracticeCompletionMethod>> = {
  correct: PracticeCompletionMethod.CORRECT,
  "self-review": PracticeCompletionMethod.SELF_REVIEW,
  revealed: PracticeCompletionMethod.REVEALED,
};

function sessionExercisesAreValid(input: PracticeSessionInput): boolean {
  const topic = getPracticeTopic(input.task, input.skillId);
  if (!topic || !hasCompletePracticePath(input.task, input.level, input.skillId)) return false;
  if (input.exerciseIds.length !== PRACTICE_EXERCISE_SEQUENCE.length) return false;
  if (new Set(input.exerciseIds).size !== input.exerciseIds.length) return false;

  const exercisesById = new Map(
    getPracticeExercises(input.task, input.level, input.skillId).map((exercise) => [exercise.id, exercise]),
  );

  return input.exerciseIds.every((id, index) => {
    const exercise = exercisesById.get(id);
    return exercise?.exerciseType === PRACTICE_EXERCISE_SEQUENCE[index];
  });
}

function getSnapshotExerciseIds(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length !== PRACTICE_EXERCISE_SEQUENCE.length) return null;
  if (!value.every((id) => typeof id === "string") || new Set(value).size !== value.length) return null;
  return value;
}

function isCompletionMethodValidForExercise(
  method: PracticeCompletionMethodInput,
  exercise: PracticeExercise,
): boolean {
  const isOpenWriting = exercise.exerciseType === "develop" || exercise.exerciseType === "produce";
  return isOpenWriting ? method === "self-review" : method === "correct" || method === "revealed";
}

/**
 * Creates the durable companion to a browser-resumable Practice session. The
 * exercise IDs are validated against the reviewed question bank before they
 * are stored, so later completion writes cannot turn this into a generic
 * client-controlled activity log.
 */
export async function createPracticeSession(userId: string, input: PracticeSessionInput): Promise<{ id: string } | null> {
  if (!sessionExercisesAreValid(input)) return null;

  return prisma.practiceSession.create({
    data: {
      userId,
      taskType: input.task,
      targetLevel: input.level as DatabasePracticeLevel,
      skillId: input.skillId,
      exerciseIds: [...input.exerciseIds],
    },
    select: { id: true },
  });
}

export type RecordPracticeCompletionResult =
  | { kind: "recorded"; sequenceCompleted: boolean }
  | { kind: "not-found" }
  | { kind: "invalid" };

/**
 * Records a completion at most once per session/exercise. We retain the
 * first method rather than updating it: a reviewed answer should never later
 * appear as independent work merely because the browser retried a request.
 */
export async function recordPracticeCompletion(
  userId: string,
  sessionId: string,
  exerciseId: string,
  completionMethod: PracticeCompletionMethodInput,
): Promise<RecordPracticeCompletionResult> {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, taskType: true, targetLevel: true, skillId: true, exerciseIds: true },
  });
  if (!session) return { kind: "not-found" };

  const snapshotExerciseIds = getSnapshotExerciseIds(session.exerciseIds);
  if (!snapshotExerciseIds || !snapshotExerciseIds.includes(exerciseId)) return { kind: "invalid" };

  const exercise = getPracticeExercises(session.taskType, session.targetLevel, session.skillId).find(
    (candidate) => candidate.id === exerciseId,
  );
  if (!exercise || !isCompletionMethodValidForExercise(completionMethod, exercise)) return { kind: "invalid" };

  return prisma.$transaction(async (tx) => {
    await tx.practiceExerciseCompletion.upsert({
      where: { sessionId_exerciseId: { sessionId: session.id, exerciseId } },
      create: {
        sessionId: session.id,
        exerciseId,
        exerciseType: exercise.exerciseType,
        completionMethod: COMPLETION_METHODS[completionMethod],
      },
      // Idempotency must preserve the original method (especially REVEALED),
      // never promote a later duplicate request to independent completion.
      update: {},
    });

    const completionCount = await tx.practiceExerciseCompletion.count({ where: { sessionId: session.id } });
    const sequenceCompleted = completionCount === snapshotExerciseIds.length;
    if (sequenceCompleted) {
      await tx.practiceSession.updateMany({
        where: { id: session.id, completedAt: null },
        data: { completedAt: new Date() },
      });
    }

    return { kind: "recorded" as const, sequenceCompleted };
  });
}

/**
 * Deletes every recorded Practice session (and, via cascade, its exercise
 * completions) for this learner, so a fixed sequence they already finished
 * can be started fresh. Scoped to userId in the query itself rather than
 * checked afterward, so this can never touch another learner's rows.
 */
export async function clearPracticeProgress(userId: string): Promise<void> {
  await prisma.practiceSession.deleteMany({ where: { userId } });
}

/** Dashboard-safe aggregate: no answers, exercise prompts, or free writing. */
export async function getPracticeProgressSummary(userId: string): Promise<PracticeProgressSummary> {
  const [groups, completedSessions] = await Promise.all([
    prisma.practiceExerciseCompletion.groupBy({
      by: ["completionMethod"],
      where: { session: { userId } },
      _count: { _all: true },
    }),
    prisma.practiceSession.findMany({
      where: { userId, completedAt: { not: null } },
      // The part itself is stable across target levels. Replaying it, or
      // training it again at C1 after B2, remains one task part trained.
      distinct: ["taskType", "skillId"],
      select: { id: true },
    }),
  ]);

  const countFor = (method: PracticeCompletionMethod) =>
    groups.find((group) => group.completionMethod === method)?._count._all ?? 0;
  const completedWithHelp = countFor(PracticeCompletionMethod.REVEALED);
  const completedIndependently =
    countFor(PracticeCompletionMethod.CORRECT) + countFor(PracticeCompletionMethod.SELF_REVIEW);

  return {
    completedExercises: completedIndependently + completedWithHelp,
    completedIndependently,
    completedWithHelp,
    completedTaskParts: completedSessions.length,
  };
}
