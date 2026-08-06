import type { CefrLevel, TaskType } from "@prisma/client";
import { TASK_ORDER } from "@/lib/tcf-tasks";

// Client-safe: types and pure grouping logic only, no Prisma import. Keep it
// that way -- ProgressChart (a Client Component) imports from here, and
// anything with a runtime Prisma import in this module's graph would get
// bundled into the browser and crash on hydration.

export interface EssayProgressPoint {
  id: string;
  assessedAt: string;
  taskType: TaskType;
  cefrLevel: CefrLevel;
  cefrRank: number;
  wordCount: number;
  meetsWordCount: boolean;
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
