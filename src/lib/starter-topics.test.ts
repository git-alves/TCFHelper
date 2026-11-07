import { describe, expect, it } from "vitest";
import { TaskType } from "@prisma/client";
import { STARTER_TOPICS } from "@/lib/starter-topics";
import { hasTaskThreeDocuments, splitTaskThreeDocuments } from "@/lib/task-three-topic";

const TASKS = [TaskType.TASK_1, TaskType.TASK_2, TaskType.TASK_3] as const;
const forTask = (task: TaskType) => STARTER_TOPICS.filter((topic) => topic.taskType === task);

describe("starter topic bank", () => {
  it.each(TASKS)("holds 30 topics for %s", (task) => {
    expect(forTask(task)).toHaveLength(30);
  });

  it.each(TASKS)("gives every %s topic a distinct title (the seed sync matches by title)", (task) => {
    const titles = forTask(task).map((topic) => topic.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("gives every topic a non-empty title and prompt and a guide context", () => {
    for (const topic of STARTER_TOPICS) {
      expect(topic.title.trim()).not.toBe("");
      expect(topic.prompt.trim()).not.toBe("");
      expect(topic.guideContext).toBeDefined();
    }
  });

  it("keeps every Tâche 3 topic in the title + Document 1 + Document 2 shape the app parses", () => {
    for (const topic of forTask(TaskType.TASK_3)) {
      expect(hasTaskThreeDocuments(topic.prompt), topic.title).toBe(true);
      expect(topic.prompt.startsWith(`${topic.title}\n\n`), topic.title).toBe(true);
    }
  });

  it("does not put document labels in Tâche 1 or Tâche 2 prompts", () => {
    for (const topic of [...forTask(TaskType.TASK_1), ...forTask(TaskType.TASK_2)]) {
      expect(hasTaskThreeDocuments(topic.prompt), topic.title).toBe(false);
    }
  });

  it("asks Tâche 2 for an experience and an opinion, with an audience and a purpose", () => {
    for (const topic of forTask(TaskType.TASK_2)) {
      expect(topic.prompt, topic.title).toMatch(/racontez/i);
      expect(topic.prompt, topic.title).toMatch(/(donnez|exprimez|partagez) votre avis/i);
      expect(topic.prompt, topic.title).toMatch(/afin d/i);
    }
  });

  it("gives each Tâche 3 document a substantial text, as on the exam sheet", () => {
    for (const topic of forTask(TaskType.TASK_3)) {
      const split = splitTaskThreeDocuments(topic.prompt);
      expect(split, topic.title).not.toBeNull();
      const [one, two] = split!.documents;
      expect(one.split(/\s+/).length, `${topic.title} / Document 1`).toBeGreaterThanOrEqual(40);
      expect(two.split(/\s+/).length, `${topic.title} / Document 2`).toBeGreaterThanOrEqual(40);
      expect(one, topic.title).not.toBe(two);
      expect(split!.heading, topic.title).toBe(topic.title);
    }
  });
});
