import { PrismaClient, TaskType, TopicSource } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { STARTER_TOPICS_238 } from "@/lib/fixtures/starter-topics-238";
import { runLockedSeedTopicSync, runLockedStarterTopicBankSync } from "@/lib/seed-topic-sync";
import { STARTER_TOPICS } from "@/lib/starter-topics";
import { splitTaskThreeDocuments } from "@/lib/task-three-topic";

const { afterCallbacks, getCurrentActivatedAppUserMock } = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => Promise<void>>,
  getCurrentActivatedAppUserMock: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/activated-app-user", () => ({ getCurrentActivatedAppUser: getCurrentActivatedAppUserMock }));
vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: (callback: () => Promise<void>) => afterCallbacks.push(callback) };
});

const prisma = new PrismaClient();

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("real PostgreSQL starter-topic rollout", () => {
  beforeAll(async () => {
    assertScratchDatabase();
    await prisma.topic.deleteMany();
    await prisma.starterTopicBankState.deleteMany();
    getCurrentActivatedAppUserMock.mockResolvedValue({ id: "db-test-user" });
  });
  afterAll(async () => prisma.$disconnect());

  it("replaces #238 rows once, fences stale/conflicting callers, heals, and syncs after a production route response", async () => {
    await expect(runLockedSeedTopicSync(prisma, STARTER_TOPICS_238)).resolves.toMatchObject({ created: 90 });
    const { GET } = await import("@/app/api/topics/random/route");
    const request = new Request("http://localhost/api/topics/random?taskType=TASK_3");

    const before = await GET(request);
    expect(splitTaskThreeDocuments((await before.json()).topic.prompt)!.documents[0].split(/\s+/).length).toBeLessThan(40);
    expect(afterCallbacks).toHaveLength(1);
    await afterCallbacks.shift()!();

    const after = await GET(request);
    const documents = splitTaskThreeDocuments((await after.json()).topic.prompt)!;
    expect(documents.documents.every((document) => document.split(/\s+/).length >= 40)).toBe(true);
    expect(await prisma.starterTopicBankState.findUnique({ where: { id: 1 } })).toMatchObject({ version: 1 });
    expect(await prisma.topic.count({ where: { source: TopicSource.OFFICIAL_EXAM, retiredAt: null } })).toBe(90);

    await expect(runLockedStarterTopicBankSync(prisma, { version: 1, topics: STARTER_TOPICS })).resolves.toMatchObject({ status: "unchanged" });
    await expect(runLockedStarterTopicBankSync(prisma, { version: 1, topics: [...STARTER_TOPICS, { ...STARTER_TOPICS[0], prompt: "conflict" }] })).rejects.toThrow();
    await expect(runLockedStarterTopicBankSync(prisma, { version: 1, topics: STARTER_TOPICS })).resolves.toMatchObject({ status: "unchanged" });

    const one = new PrismaClient(); const two = new PrismaClient();
    const concurrent = await Promise.all([runLockedStarterTopicBankSync(one, { version: 2, topics: STARTER_TOPICS }), runLockedStarterTopicBankSync(two, { version: 2, topics: STARTER_TOPICS })]);
    await Promise.all([one.$disconnect(), two.$disconnect()]);
    expect(concurrent.filter((result) => result.status === "applied")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "unchanged")).toHaveLength(1);

    const row = await prisma.topic.findFirstOrThrow({ where: { taskType: TaskType.TASK_3, source: TopicSource.OFFICIAL_EXAM, retiredAt: null } });
    await prisma.topic.update({ where: { id: row.id }, data: { retiredAt: new Date() } });
    await expect(runLockedStarterTopicBankSync(prisma, { version: 2, topics: STARTER_TOPICS })).resolves.toMatchObject({ status: "applied", created: 1 });
  });
});

function assertScratchDatabase() {
  if (process.env.TCFHELPER_DB_TEST_SCRATCH !== "1") {
    throw new Error("Refusing DB rollout test: TCFHELPER_DB_TEST_SCRATCH=1 is required before deleting data.");
  }
  const url = new URL(process.env.DATABASE_URL ?? "");
  const expectedPort = process.env.TCFHELPER_DB_TEST_PORT;
  if (!expectedPort || !["127.0.0.1", "localhost"].includes(url.hostname) || url.port !== expectedPort) {
    throw new Error("Refusing DB rollout test: DATABASE_URL must target this runner's localhost scratch port.");
  }
}
