import { describe, expect, it } from "vitest";
import { TASK_INSTRUCTIONS } from "./tcf-tasks";

describe("TCF task definitions", () => {
  it("defines Task 2 as experience-led blog or email writing", () => {
    const task = TASK_INSTRUCTIONS.TASK_2;

    expect(task.title).toBe("Raconter et commenter");
    expect(task.description).toContain("article de blog ou un e-mail");
    expect(task.description).toContain("raconter une expérience ou un événement");
    expect(task.description).toContain("détails utiles");
  });

  it.each(Object.entries(TASK_INSTRUCTIONS))("keeps %s example target inside its required word range", (_taskType, task) => {
    expect(task.exampleTargetWords).toBeGreaterThanOrEqual(task.minWords);
    expect(task.exampleTargetWords).toBeLessThanOrEqual(task.maxWords);
  });
});
