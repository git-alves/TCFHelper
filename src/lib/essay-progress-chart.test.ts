import { describe, expect, it } from "vitest";
import { groupEssayProgressByTask, type EssayProgressPoint } from "./essay-progress-chart";

function point(overrides: Partial<EssayProgressPoint>): EssayProgressPoint {
  return {
    id: "essay_1",
    assessedAt: "2026-08-01T00:00:00.000Z",
    taskType: "TASK_1",
    cefrLevel: "B2",
    cefrRank: 4,
    wordCount: 90,
    meetsWordCount: true,
    ...overrides,
  };
}

describe("groupEssayProgressByTask", () => {
  it("groups points by task in TASK_ORDER with a 1-based label number", () => {
    const points = [
      point({ id: "t2_1", taskType: "TASK_2" }),
      point({ id: "t1_1", taskType: "TASK_1" }),
    ];

    const series = groupEssayProgressByTask(points, 8);

    expect(series.map((s) => s.taskType)).toEqual(["TASK_1", "TASK_2"]);
    expect(series.map((s) => s.number)).toEqual([1, 2]);
  });

  it("drops a task with no attempts instead of plotting an empty series", () => {
    const points = [point({ taskType: "TASK_1" })];

    const series = groupEssayProgressByTask(points, 8);

    expect(series).toHaveLength(1);
    expect(series[0].taskType).toBe("TASK_1");
  });

  it("keeps only the most recent attempts per task, in chronological order", () => {
    const points = [
      point({ id: "1", taskType: "TASK_1", assessedAt: "2026-08-01T00:00:00.000Z" }),
      point({ id: "2", taskType: "TASK_1", assessedAt: "2026-08-02T00:00:00.000Z" }),
      point({ id: "3", taskType: "TASK_1", assessedAt: "2026-08-03T00:00:00.000Z" }),
    ];

    const series = groupEssayProgressByTask(points, 2);

    expect(series[0].attempts.map((a) => a.id)).toEqual(["2", "3"]);
  });

  it("returns no series at all when there are no points", () => {
    expect(groupEssayProgressByTask([], 8)).toEqual([]);
  });
});
