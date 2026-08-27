import { describe, expect, it } from "vitest";
import {
  FULL_EXAM_REVIEW_MINUTES,
  FULL_EXAM_TOTAL_MINUTES,
  TIMED_TASK_PLANS,
  formatRemainingTime,
  getReachedTimedTaskPhases,
  getTimedTaskPhase,
  getTimedTaskTotalMilliseconds,
} from "./timed-task";

describe("TIMED_TASK_PLANS", () => {
  it("sums each task's phases to its total minutes", () => {
    for (const plan of Object.values(TIMED_TASK_PLANS)) {
      const total = plan.phases.reduce((sum, phase) => sum + phase.durationMilliseconds, 0);
      expect(total).toBe(plan.totalMinutes * 60_000);
    }
  });

  it("uses the requested 60-minute exam allocation", () => {
    const taskMinutes = Object.values(TIMED_TASK_PLANS).reduce((sum, plan) => sum + plan.totalMinutes, 0);

    expect(taskMinutes).toBe(55);
    expect(taskMinutes + FULL_EXAM_REVIEW_MINUTES).toBe(FULL_EXAM_TOTAL_MINUTES);
  });

  it("moves to the next phase at exact phase boundaries", () => {
    expect(getTimedTaskPhase("TASK_1", getTimedTaskTotalMilliseconds("TASK_1")).id).toBe("plan");
    expect(getTimedTaskPhase("TASK_1", 10 * 60_000).id).toBe("write");
    expect(getTimedTaskPhase("TASK_3", 13 * 60_000).id).toBe("argue");
    expect(getTimedTaskPhase("TASK_3", 2 * 60_000).id).toBe("check");
  });

  it("keeps extra time in the final checking phase", () => {
    expect(getTimedTaskPhase("TASK_2", 0).id).toBe("check");
  });

  it("scales phase boundaries when the learner changes the duration", () => {
    // Task 1 planning is 2/12 of its recommended duration, so it occupies
    // the first 50 seconds of a five-minute custom session.
    expect(getTimedTaskPhase("TASK_1", 250_001, 5 * 60_000).id).toBe("plan");
    expect(getTimedTaskPhase("TASK_1", 250_000, 5 * 60_000).id).toBe("write");
  });

  it("reports only the phases reached when a learner ends early", () => {
    expect(getReachedTimedTaskPhases("TASK_1", 0).map((phase) => phase.id)).toEqual(["plan"]);
    expect(getReachedTimedTaskPhases("TASK_1", 2 * 60_000).map((phase) => phase.id)).toEqual(["plan", "write"]);
    expect(getReachedTimedTaskPhases("TASK_3", 23 * 60_000).map((phase) => phase.id)).toEqual([
      "analyse",
      "synthesise",
      "argue",
      "check",
    ]);
  });

  it("formats a non-negative minute-and-second countdown", () => {
    expect(formatRemainingTime(12 * 60_000)).toEqual({ minutes: "12", seconds: "00" });
    expect(formatRemainingTime(65_001)).toEqual({ minutes: "1", seconds: "06" });
    expect(formatRemainingTime(-1)).toEqual({ minutes: "0", seconds: "00" });
  });
});
