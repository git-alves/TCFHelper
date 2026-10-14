import { describe, expect, it } from "vitest";
import { createFrenchReplay, type ReplayEssay } from "./french-text-replay";

const FRENCH =
  "Je vous écris pour vous parler de mon quartier, qui est très agréable et dans lequel il y a beaucoup de commerces et de parcs.";
const ENGLISH = "I am writing to tell you about my neighbourhood, which is very quiet and has many shops and parks for the children.";

function essay(id: string, content: string, overrides: Partial<ReplayEssay> = {}): ReplayEssay {
  return { id, taskType: "TASK_1", wordCount: 60, level: "B1", content, ...overrides };
}

describe("createFrenchReplay", () => {
  it("counts accepted and rejected essays and breaks them down by task and level", () => {
    const replay = createFrenchReplay();
    replay.add(essay("a", FRENCH));
    replay.add(essay("b", FRENCH, { taskType: "TASK_2", level: "C1" }));
    replay.add(essay("c", ENGLISH, { taskType: "TASK_2", level: null }));

    const summary = replay.summary();

    expect(summary.total).toBe(3);
    expect(summary.rejected).toBe(1);
    expect(summary.rejectionRate).toBeCloseTo(0.333, 3);
    expect(summary.byReason).toEqual({ script: 0, language: 1 });
    expect(summary.byTaskType).toEqual({ TASK_1: { total: 1, rejected: 0 }, TASK_2: { total: 2, rejected: 1 } });
    expect(summary.byLevel).toEqual({
      B1: { total: 1, rejected: 0 },
      C1: { total: 1, rejected: 0 },
      none: { total: 1, rejected: 1 },
    });
  });

  it("lists each rejection with its scores so a false positive can be diagnosed", () => {
    const replay = createFrenchReplay();
    replay.add(essay("only-english", ENGLISH));

    expect(replay.summary().rejections).toEqual([
      expect.objectContaining({
        id: "only-english",
        reason: "language",
        frenchShare: expect.any(Number),
        strongestCompetitor: "english",
      }),
    ]);
  });

  it("never carries the submitted text into the summary", () => {
    const replay = createFrenchReplay();
    replay.add(essay("x", ENGLISH));
    replay.add(essay("y", FRENCH));

    const serialized = JSON.stringify(replay.summary());

    expect(serialized).not.toContain("neighbourhood");
    expect(serialized).not.toContain("quartier");
  });

  it("reports a zero rate for an empty replay", () => {
    expect(createFrenchReplay().summary()).toMatchObject({ total: 0, rejected: 0, rejectionRate: 0 });
  });
});
