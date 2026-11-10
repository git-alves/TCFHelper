import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, findManyMock, ensureStarterTopicBankSyncedMock, afterMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    findManyMock: vi.fn(),
    ensureStarterTopicBankSyncedMock: vi.fn(),
    afterMock: vi.fn(),
  };
});

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server");
  return { ...actual, after: afterMock };
});

vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/app-user", () => ({ AppUserProvisioningError: AppUserProvisioningErrorMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { topic: { findMany: findManyMock } },
}));
vi.mock("@/lib/starter-topic-bank-sync", () => ({ ensureStarterTopicBankSynced: ensureStarterTopicBankSyncedMock }));

const { GET } = await import("./route");

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  findManyMock.mockReset();
  ensureStarterTopicBankSyncedMock.mockReset();
  afterMock.mockReset();
  getCurrentActivatedAppUserMock.mockResolvedValue({ id: "learner_1" });
  findManyMock.mockResolvedValue([]);
  ensureStarterTopicBankSyncedMock.mockResolvedValue(undefined);
});

describe("GET /api/topics", () => {
  it("requires an activated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/topics?taskType=TASK_1"));

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("fails closed while the signed-in account cannot be provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock());

    const response = await GET(new Request("http://localhost/api/topics?taskType=TASK_1"));

    expect(response.status).toBe(503);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns only seeded, official topics rather than learner-supplied prompts", async () => {
    const response = await GET(new Request("http://localhost/api/topics?taskType=TASK_1"));

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { taskType: "TASK_1", source: "OFFICIAL_EXAM", retiredAt: null },
      select: { id: true, title: true, prompt: true },
    });
  });

  it("schedules the lazy deployed-bank reconciliation after the response", async () => {
    await GET(new Request("http://localhost/api/topics?taskType=TASK_1"));

    expect(afterMock).toHaveBeenCalledWith(ensureStarterTopicBankSyncedMock);
    expect(ensureStarterTopicBankSyncedMock).not.toHaveBeenCalled();
  });

  it("returns even when the scheduled synchronization never resolves", async () => {
    ensureStarterTopicBankSyncedMock.mockImplementation(() => new Promise<void>(() => undefined));
    afterMock.mockImplementation((callback: () => Promise<void>) => {
      void callback();
    });

    const response = await Promise.race([
      GET(new Request("http://localhost/api/topics?taskType=TASK_1")),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("GET waited for sync")), 100)),
    ]);

    expect(response.status).toBe(200);
  });

  it("rejects an invalid task type before querying the topic bank", async () => {
    const response = await GET(new Request("http://localhost/api/topics?taskType=TASK_4"));

    expect(response.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
