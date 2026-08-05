import { TopicSource, TaskType, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { syncSeedTopics } from "./seed-topic-sync";

const findFirst = vi.fn();
const create = vi.fn();
const update = vi.fn();

const prisma = {
  topic: { findFirst, create, update },
} as unknown as Pick<PrismaClient, "topic">;

const starterTopic = {
  taskType: TaskType.TASK_3,
  title: "Sujet de départ",
  prompt: "Sujet de départ\n\nDocument 1 :\nPour\n\nDocument 2 :\nContre",
};

beforeEach(() => {
  findFirst.mockReset();
  create.mockReset();
  update.mockReset();
});

describe("syncSeedTopics", () => {
  it("creates a missing managed starter topic", async () => {
    findFirst.mockResolvedValue(null);

    await expect(syncSeedTopics(prisma, [starterTopic])).resolves.toEqual({
      created: 1,
      updated: 0,
      unchanged: 0,
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        title: starterTopic.title,
        taskType: TaskType.TASK_3,
        source: TopicSource.OFFICIAL_EXAM,
      },
      select: { id: true, prompt: true },
    });
    expect(create).toHaveBeenCalledWith({
      data: { ...starterTopic, source: TopicSource.OFFICIAL_EXAM },
    });
  });

  it("updates an outdated managed starter prompt to the current Task 3 format", async () => {
    findFirst.mockResolvedValue({ id: "seed_topic_1", prompt: "Ancien format" });

    await expect(syncSeedTopics(prisma, [starterTopic])).resolves.toEqual({
      created: 0,
      updated: 1,
      unchanged: 0,
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "seed_topic_1" },
      data: { prompt: starterTopic.prompt },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("leaves an already-current managed starter prompt unchanged", async () => {
    findFirst.mockResolvedValue({ id: "seed_topic_1", prompt: starterTopic.prompt });

    await expect(syncSeedTopics(prisma, [starterTopic])).resolves.toEqual({
      created: 0,
      updated: 0,
      unchanged: 1,
    });

    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
