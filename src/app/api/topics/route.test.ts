import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, findManyMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    findManyMock: vi.fn(),
  };
});

vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/app-user", () => ({ AppUserProvisioningError: AppUserProvisioningErrorMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { topic: { findMany: findManyMock } },
}));

const { GET } = await import("./route");

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  findManyMock.mockReset();
  getCurrentActivatedAppUserMock.mockResolvedValue({ id: "learner_1" });
  findManyMock.mockResolvedValue([]);
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

  it("rejects an invalid task type before querying the topic bank", async () => {
    const response = await GET(new Request("http://localhost/api/topics?taskType=TASK_4"));

    expect(response.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
