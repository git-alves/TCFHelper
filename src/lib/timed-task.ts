import type { TaskType } from "@prisma/client";

// These fixed allocations leave five minutes for the final review in a
// future full-exam flow: 12 + 20 + 23 + 5 = 60 minutes. Single-task practice
// uses only the selected task's plan.
export type TimedTaskPhaseId = "plan" | "write" | "analyse" | "synthesise" | "argue" | "check";

export interface TimedTaskPhase {
  id: TimedTaskPhaseId;
  durationMilliseconds: number;
}

export interface TimedTaskPlan {
  totalMinutes: number;
  phases: readonly TimedTaskPhase[];
}

const MINUTE = 60_000;
export const FULL_EXAM_REVIEW_MINUTES = 5;
export const FULL_EXAM_TOTAL_MINUTES = 60;

export const TIMED_TASK_PLANS: Record<TaskType, TimedTaskPlan> = {
  TASK_1: {
    totalMinutes: 12,
    phases: [
      { id: "plan", durationMilliseconds: 2 * MINUTE },
      { id: "write", durationMilliseconds: 8 * MINUTE },
      { id: "check", durationMilliseconds: 2 * MINUTE },
    ],
  },
  TASK_2: {
    totalMinutes: 20,
    phases: [
      { id: "plan", durationMilliseconds: 3 * MINUTE },
      { id: "write", durationMilliseconds: 15 * MINUTE },
      { id: "check", durationMilliseconds: 2 * MINUTE },
    ],
  },
  TASK_3: {
    totalMinutes: 23,
    phases: [
      { id: "analyse", durationMilliseconds: 5 * MINUTE },
      { id: "synthesise", durationMilliseconds: 5 * MINUTE },
      { id: "argue", durationMilliseconds: 11 * MINUTE },
      { id: "check", durationMilliseconds: 2 * MINUTE },
    ],
  },
};

export function getTimedTaskTotalMilliseconds(taskType: TaskType): number {
  return TIMED_TASK_PLANS[taskType].totalMinutes * MINUTE;
}

// `remainingMilliseconds` is used rather than a tick counter so a background
// browser tab always resumes at the correct phase.
export function getTimedTaskPhase(
  taskType: TaskType,
  remainingMilliseconds: number,
  totalDurationMilliseconds = getTimedTaskTotalMilliseconds(taskType),
): TimedTaskPhase {
  const plan = TIMED_TASK_PLANS[taskType];
  const defaultDuration = getTimedTaskTotalMilliseconds(taskType);
  const totalDuration = Math.max(1, totalDurationMilliseconds);
  const elapsed = Math.max(0, totalDuration - Math.max(0, remainingMilliseconds));
  let boundary = 0;

  for (const phase of plan.phases) {
    boundary += (phase.durationMilliseconds / defaultDuration) * totalDuration;
    if (elapsed < boundary) return phase;
  }

  // When the learner adds time after expiry, keep the coaching focused on the
  // final check instead of inventing another mandatory writing phase.
  return plan.phases.at(-1)!;
}

export function formatRemainingTime(remainingMilliseconds: number): { minutes: string; seconds: string } {
  const totalSeconds = Math.ceil(Math.max(0, remainingMilliseconds) / 1_000);
  return {
    minutes: String(Math.floor(totalSeconds / 60)),
    seconds: String(totalSeconds % 60).padStart(2, "0"),
  };
}
