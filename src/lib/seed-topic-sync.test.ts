import { TopicSource, TaskType, type PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runLockedSeedTopicSync, syncSeedTopics } from "./seed-topic-sync";

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
      retired: 0,
      unchanged: 0,
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        title: starterTopic.title,
        taskType: TaskType.TASK_3,
        source: TopicSource.OFFICIAL_EXAM,
        retiredAt: null,
      },
      select: { id: true, prompt: true, guideContext: true },
      orderBy: { id: "asc" },
    });
    expect(create).toHaveBeenCalledWith({
      data: { ...starterTopic, source: TopicSource.OFFICIAL_EXAM },
    });
  });

  it("retires the existing row and creates a replacement, instead of updating the prompt in place", async () => {
    // Essays reference a shared topic only by id, and the correction-request
    // key for one is based on that same id, not prompt content -- mutating
    // the existing row's prompt would silently reassign the grading context
    // of every essay (including a mid-draft one) that already points at it.
    // retiredAt, not a new source: old app code still live during a rolling
    // deploy never reads this column, so it keeps accepting the row exactly
    // as before instead of rejecting an enum value it doesn't recognise.
    findFirst.mockResolvedValue({ id: "seed_topic_1", prompt: "Ancien format" });

    await expect(syncSeedTopics(prisma, [starterTopic])).resolves.toEqual({
      created: 0,
      retired: 1,
      unchanged: 0,
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "seed_topic_1" },
      data: { retiredAt: expect.any(Date) },
    });
    // Neither the source nor the prompt of the existing row is ever touched.
    const updateCallData = update.mock.calls[0]?.[0]?.data;
    expect(updateCallData).not.toHaveProperty("source");
    expect(updateCallData).not.toHaveProperty("prompt");
    expect(create).toHaveBeenCalledWith({
      data: { ...starterTopic, source: TopicSource.OFFICIAL_EXAM },
    });
  });

  it("leaves an already-current managed starter prompt unchanged", async () => {
    findFirst.mockResolvedValue({ id: "seed_topic_1", prompt: starterTopic.prompt, guideContext: null });

    await expect(syncSeedTopics(prisma, [starterTopic])).resolves.toEqual({
      created: 0,
      retired: 0,
      unchanged: 1,
    });

    expect(update).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it("retires and replaces a topic whose prompt is unchanged but curated guideContext was corrected", async () => {
    findFirst.mockResolvedValue({ id: "seed_topic_1", prompt: starterTopic.prompt, guideContext: null });
    const curatedTopic = { ...starterTopic, guideContext: "ARGUMENTATIVE_ANALYSIS" as const };

    await expect(syncSeedTopics(prisma, [curatedTopic])).resolves.toEqual({
      created: 0,
      retired: 1,
      unchanged: 0,
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "seed_topic_1" },
      data: { retiredAt: expect.any(Date) },
    });
    expect(create).toHaveBeenCalledWith({
      data: { ...curatedTopic, source: TopicSource.OFFICIAL_EXAM },
    });
  });
});

describe("runLockedSeedTopicSync", () => {
  it("acquires a fixed-key advisory lock inside a transaction before syncing", async () => {
    const executeRaw = vi.fn().mockResolvedValue(undefined);
    findFirst.mockResolvedValue(null);

    const transactionClient = { topic: { findFirst, create, update }, $executeRaw: executeRaw };
    const $transaction = vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient));

    const lockedPrisma = { $transaction } as unknown as PrismaClient;

    await expect(runLockedSeedTopicSync(lockedPrisma, [starterTopic])).resolves.toEqual({
      created: 1,
      retired: 0,
      unchanged: 0,
    });

    expect($transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 30_000 });
    expect(executeRaw.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    // The lock is acquired before the sync's own writes, not after.
    expect(executeRaw.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
  });

  it("locks with the exact key the first deployed guarded wrapper used, not a renamed one", async () => {
    // An older, already-deployed build's process can still be mid-seed
    // during a rolling deploy. It must acquire the *same* Postgres advisory
    // lock this build does to actually serialize against it -- silently
    // renaming the key here would let the two run concurrently again.
    const executeRaw = vi.fn().mockResolvedValue(undefined);
    findFirst.mockResolvedValue(null);

    const transactionClient = { topic: { findFirst, create, update }, $executeRaw: executeRaw };
    const $transaction = vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient));
    const lockedPrisma = { $transaction } as unknown as PrismaClient;

    await runLockedSeedTopicSync(lockedPrisma, [starterTopic]);

    expect(executeRaw.mock.calls[0]).toContain("deploy-seed-topics");
  });
});
