import "server-only";

import { PracticeCompletionMethod, type PracticeLevel as DatabasePracticeLevel, type TaskType } from "@prisma/client";
import { getSectionedPracticeExercise, type PracticeLevel } from "@/lib/sectioned-practice";
import { prisma } from "@/lib/prisma";

/**
 * "self-review": the learner wrote every section before comparing it with the
 * model answer. "revealed": they looked at a model answer for a section they
 * had left empty.
 */
export type PracticeCompletionMethodInput = "self-review" | "revealed";

export interface PracticeSessionInput {
  task: TaskType;
  level: PracticeLevel;
  exerciseId: string;
}

export interface PracticeProgressSummary {
  completedExercises: number;
  completedIndependently: number;
  completedWithHelp: number;
}

// Sectioned exercises reuse the durable ledger that the earlier part-by-part
// trainer wrote, so the Dashboard counts both without a migration. Rows from
// the earlier trainer keep their own skillId; these all share this one.
const SECTIONED_SKILL_ID = "sectioned";
const SECTIONED_EXERCISE_TYPE = "sectioned";

const COMPLETION_METHODS: Readonly<Record<PracticeCompletionMethodInput, PracticeCompletionMethod>> = {
  "self-review": PracticeCompletionMethod.SELF_REVIEW,
  revealed: PracticeCompletionMethod.REVEALED,
};

function getSnapshotExerciseIds(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every((id) => typeof id === "string")) return null;
  return value;
}

/**
 * Creates the durable companion to a browser-held Practice attempt. The
 * exercise must exist in the reviewed bank for exactly this task and level,
 * so completion writes cannot turn this into a generic activity log.
 */
export async function createPracticeSession(userId: string, input: PracticeSessionInput): Promise<{ id: string } | null> {
  const exercise = getSectionedPracticeExercise(input.exerciseId);
  if (!exercise || exercise.task !== input.task || exercise.level !== input.level) return null;

  return prisma.practiceSession.create({
    data: {
      userId,
      taskType: input.task,
      targetLevel: input.level as DatabasePracticeLevel,
      skillId: SECTIONED_SKILL_ID,
      exerciseIds: [input.exerciseId],
    },
    select: { id: true },
  });
}

export type RecordPracticeCompletionResult =
  | { kind: "recorded"; sequenceCompleted: boolean }
  | { kind: "not-found" }
  | { kind: "invalid" };

/**
 * Records a completion at most once per session/exercise. We retain the first
 * method rather than updating it: a revealed answer should never later appear
 * as independent work merely because the browser retried a request.
 */
export async function recordPracticeCompletion(
  userId: string,
  sessionId: string,
  exerciseId: string,
  completionMethod: PracticeCompletionMethodInput,
): Promise<RecordPracticeCompletionResult> {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, skillId: true, exerciseIds: true },
  });
  if (!session) return { kind: "not-found" };

  const snapshotExerciseIds = getSnapshotExerciseIds(session.exerciseIds);
  if (session.skillId !== SECTIONED_SKILL_ID || !snapshotExerciseIds?.includes(exerciseId)) {
    return { kind: "invalid" };
  }

  return prisma.$transaction(async (tx) => {
    await tx.practiceExerciseCompletion.upsert({
      where: { sessionId_exerciseId: { sessionId: session.id, exerciseId } },
      create: {
        sessionId: session.id,
        exerciseId,
        exerciseType: SECTIONED_EXERCISE_TYPE,
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
  const groups = await prisma.practiceExerciseCompletion.groupBy({
    by: ["completionMethod"],
    where: { session: { userId } },
    _count: { _all: true },
  });

  const countFor = (method: PracticeCompletionMethod) =>
    groups.find((group) => group.completionMethod === method)?._count._all ?? 0;
  const completedWithHelp = countFor(PracticeCompletionMethod.REVEALED);
  // CORRECT only appears on rows written by the earlier part-by-part trainer.
  const completedIndependently =
    countFor(PracticeCompletionMethod.CORRECT) + countFor(PracticeCompletionMethod.SELF_REVIEW);

  return {
    completedExercises: completedIndependently + completedWithHelp,
    completedIndependently,
    completedWithHelp,
  };
}
