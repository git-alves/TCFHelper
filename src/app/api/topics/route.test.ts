import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentClerkUserIdMock, findManyMock } = vi.hoisted(() => ({
  getCurrentClerkUserIdMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/app-user", () => ({ getCurrentClerkUserId: getCurrentClerkUserIdMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { topic: { findMany: findManyMock } },
}));

const { GET } = await import("./route");

beforeEach(() => {
  getCurrentClerkUserIdMock.mockReset();
  findManyMock.mockReset();
  getCurrentClerkUserIdMock.mockResolvedValue("clerk_user_1");
  findManyMock.mockResolvedValue([]);
});

describe("GET /api/topics", () => {
  it("requires an authenticated Clerk subject", async () => {
    getCurrentClerkUserIdMock.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/topics?taskType=TASK_1"));

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("returns only seeded, official topics rather than learner-supplied prompts", async () => {
    const response = await GET(new Request("http://localhost/api/topics?taskType=TASK_1"));

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith({
      where: { taskType: "TASK_1", source: "OFFICIAL_EXAM" },
      select: { id: true, title: true, prompt: true },
    });
  });

  it("rejects an invalid task type before querying the topic bank", async () => {
    const response = await GET(new Request("http://localhost/api/topics?taskType=TASK_4"));

    expect(response.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
