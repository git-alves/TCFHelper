import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { TaskType } from "@prisma/client";
import { STARTER_TOPIC_BANK_HASHES, STARTER_TOPIC_BANK_VERSION, STARTER_TOPICS } from "@/lib/starter-topics";
import { getStarterTopicBankHash } from "@/lib/seed-topic-sync";
import { hasTaskThreeDocuments, splitTaskThreeDocuments } from "@/lib/task-three-topic";

const TASKS = [TaskType.TASK_1, TaskType.TASK_2, TaskType.TASK_3] as const;
const forTask = (task: TaskType) => STARTER_TOPICS.filter((topic) => topic.taskType === task);

describe("starter-topic bank version contract", () => {
  const historyInstructions = "bump the version and add a new entry, never edit an old one.";

  it("pins the current bank content to its monotonic version", () => {
    const expectedHash = STARTER_TOPIC_BANK_HASHES[STARTER_TOPIC_BANK_VERSION];
    const instructions =
      "STARTER_TOPICS changed: increment STARTER_TOPIC_BANK_VERSION and record the new getStarterTopicBankHash value in STARTER_TOPIC_BANK_HASHES.";

    expect(expectedHash, instructions).toBeDefined();
    expect(getStarterTopicBankHash(STARTER_TOPICS), instructions).toBe(expectedHash);
  });

  it("keeps bank-history versions contiguous and ends at the current version", () => {
    const versions = Object.keys(STARTER_TOPIC_BANK_HASHES).map(Number).sort((a, b) => a - b);

    expect(versions, historyInstructions).toEqual(Array.from({ length: STARTER_TOPIC_BANK_VERSION }, (_, index) => index + 1));
    expect(versions.at(-1), historyInstructions).toBe(STARTER_TOPIC_BANK_VERSION);
  });

  it("never changes a hash already recorded on origin/main", () => {
    let source: string;
    try {
      source = execFileSync("git", ["show", "origin/main:src/lib/starter-topics.ts"], {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      console.info("Skipping immutable starter-topic history comparison: origin/main is unavailable.");
      return;
    }

    const mapMatch = source.match(/STARTER_TOPIC_BANK_HASHES[^=]*=\s*\{([\s\S]*?)\n\};/);
    if (!mapMatch) {
      console.info("Skipping immutable starter-topic history comparison: origin/main predates STARTER_TOPIC_BANK_HASHES.");
      return;
    }

    const originEntries = [...mapMatch[1].matchAll(/(\d+)\s*:\s*["']([a-f0-9]{64})["']/g)];
    for (const [, version, hash] of originEntries) {
      expect(STARTER_TOPIC_BANK_HASHES[Number(version)], historyInstructions).toBe(hash);
    }
  });
});

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
