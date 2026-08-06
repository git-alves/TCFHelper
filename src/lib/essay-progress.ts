import { EssayStatus } from "@prisma/client";
import type { CefrLevel, TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TASK_ORDER } from "@/lib/tcf-tasks";

// Presentation-only ordering for plotting a categorical level on a numeric
// axis -- not a statistically meaningful score, and never persisted.
const CEFR_RANK: Record<CefrLevel, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

export interface EssayProgressPoint {
  id: string;
  assessedAt: string;
  taskType: TaskType;
  cefrLevel: CefrLevel;
  cefrRank: number;
  wordCount: number;
  meetsWordCount: boolean;
}

/**
 * Every successful correction already creates an Essay + Feedback row (see
 * /api/essays/correct), so this reads existing history rather than deriving
 * or storing anything new. Only a submitted essay with an assessed level
 * counts as a graphable attempt -- a draft, or a correction call that failed
 * before a model response came back, never becomes one of these rows.
 */
export async function getEssayProgressPoints(userId: string): Promise<EssayProgressPoint[]> {
  const essays = await prisma.essay.findMany({
    where: {
      userId,
      status: EssayStatus.SUBMITTED,
      feedback: { is: { level: { not: null } } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      taskType: true,
      wordCount: true,
      feedback: { select: { level: true, meetsWordCount: true, createdAt: true } },
    },
  });

  const points: EssayProgressPoint[] = [];
  for (const essay of essays) {
    // The where clause above already filters to a non-null level; this
    // narrows the type Prisma still infers as nullable and defensively
    // skips a row a concurrent write could have changed since the query ran.
    if (!essay.feedback || !essay.feedback.level) continue;

    points.push({
      id: essay.id,
      assessedAt: essay.feedback.createdAt.toISOString(),
      taskType: essay.taskType,
      cefrLevel: essay.feedback.level,
      cefrRank: CEFR_RANK[essay.feedback.level],
      wordCount: essay.wordCount,
      meetsWordCount: essay.feedback.meetsWordCount,
    });
  }

  return points;
}

export interface EssayProgressSeries {
  taskType: TaskType;
  /** 1-based position in TASK_ORDER, for a "Task {number}" style label. */
  number: number;
  attempts: EssayProgressPoint[];
}

/**
 * Groups points by task (in TASK_ORDER) and keeps only each task's most
 * recent attempts, dropping a task with none rather than plotting an empty
 * line for it.
 */
export function groupEssayProgressByTask(
  points: EssayProgressPoint[],
  maxAttemptsPerTask: number,
): EssayProgressSeries[] {
  const byTask = new Map<TaskType, EssayProgressPoint[]>();
  for (const point of points) {
    const list = byTask.get(point.taskType) ?? [];
    list.push(point);
    byTask.set(point.taskType, list);
  }

  return TASK_ORDER.map((taskType, index) => ({
    taskType,
    number: index + 1,
    attempts: (byTask.get(taskType) ?? []).slice(-maxAttemptsPerTask),
  })).filter((series) => series.attempts.length > 0);
}
