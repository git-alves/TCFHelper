import { describe, expect, it } from "vitest";
import { createFrenchReplay, formatReplayReport, type ReplayEssay } from "./french-text-replay";

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
    expect(summary.potentialBlocks).toBe(1);
    expect(summary.potentialBlockRate).toBeCloseTo(0.333, 3);
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
    expect(createFrenchReplay().summary()).toMatchObject({ total: 0, potentialBlocks: 0, potentialBlockRate: 0 });
  });

  it("labels the rate as a potential block rate, never a false-positive rate", () => {
    const summary = createFrenchReplay().summary();

    expect(summary.metric).toBe("historical potential block rate (not a false-positive rate)");
    expect(Object.keys(summary).join(" ")).not.toMatch(/falsePositive/i);
  });
});

describe("formatReplayReport", () => {
  function replayWithOneBlock() {
    const replay = createFrenchReplay();
    replay.add(essay("essay-123", ENGLISH));
    replay.add(essay("essay-456", FRENCH));
    return replay.summary();
  }

  it("is aggregate-only by default: no essay ids and no per-essay records", () => {
    const report = formatReplayReport(replayWithOneBlock(), { showIds: false });

    expect(report).not.toContain("essay-123");
    expect(report).not.toContain("rejections");
    expect(JSON.parse(report)).toMatchObject({ total: 2, potentialBlocks: 1, potentialBlockRate: 0.5 });
  });

  it("includes the ids and scores of blocked essays only when asked", () => {
    const report = formatReplayReport(replayWithOneBlock(), { showIds: true });

    expect(report).toContain("essay-123");
    expect(report).not.toContain("essay-456");
    expect(report).not.toContain("neighbourhood");
  });
});
