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
});
