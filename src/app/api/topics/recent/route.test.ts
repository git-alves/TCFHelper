import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, getRecentExamTopicMock, upsertMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getRecentExamTopicMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/recent-exam-topics", () => ({
  getRecentExamTopic: getRecentExamTopicMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { topic: { upsert: upsertMock } },
}));

const { GET } = await import("./route");

const recentTopic = {
  taskType: "TASK_2",
  title: "Tâche 2 — Les activités culturelles",
  prompt: "Vous participez à un forum sur les activités culturelles.",
  sourceUrl: "https://reussir-tcfcanada.com/juillet-2026-expression-ecrite/",
  externalRef: "recent-exam:2026-07:TASK_2:3:7d619f",
  sourceMonth: "2026-07",
  combination: 3,
};

beforeEach(() => {
  authMock.mockReset();
  getRecentExamTopicMock.mockReset();
  upsertMock.mockReset();

  authMock.mockResolvedValue({ user: { id: "user_1" } });
  getRecentExamTopicMock.mockResolvedValue(recentTopic);
  upsertMock.mockResolvedValue({
    id: "recent_topic_1",
    taskType: recentTopic.taskType,
    title: recentTopic.title,
    prompt: recentTopic.prompt,
    source: "RECENT_EXAM",
    sourceUrl: recentTopic.sourceUrl,
  });
});

describe("GET /api/topics/recent", () => {
  it("persists a fetched current-month topic by its content-based external reference", async () => {
    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_2")
    );

    expect(response.status).toBe(200);
    expect(getRecentExamTopicMock).toHaveBeenCalledWith("TASK_2");
    expect(upsertMock).toHaveBeenCalledWith({
      where: { externalRef: recentTopic.externalRef },
      create: {
        taskType: "TASK_2",
        title: recentTopic.title,
        prompt: recentTopic.prompt,
        source: "RECENT_EXAM",
        sourceUrl: recentTopic.sourceUrl,
        externalRef: recentTopic.externalRef,
      },
      update: {},
      select: {
        id: true,
        taskType: true,
        title: true,
        prompt: true,
        source: true,
        sourceUrl: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      topic: {
        id: "recent_topic_1",
        taskType: "TASK_2",
        title: recentTopic.title,
        prompt: recentTopic.prompt,
        sourceUrl: recentTopic.sourceUrl,
        sourceMonth: "2026-07",
      },
    });
  });

  it("marks the authenticated topic response as private and non-cacheable", async () => {
    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_2")
    );

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("rejects an invalid task type before contacting the source or database", async () => {
    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_4")
    );

    expect(response.status).toBe(400);
    expect(getRecentExamTopicMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("requires an authenticated learner", async () => {
    authMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_2")
    );

    expect(response.status).toBe(401);
    expect(getRecentExamTopicMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("keeps the custom-topic recovery path available when the source is unavailable", async () => {
    getRecentExamTopicMock.mockRejectedValue(new Error("Current-month source unavailable"));

    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_2")
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error:
        "This month's recent-exam topic is unavailable. Please write or paste your own topic.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("fails closed when a source returns a topic for another task", async () => {
    getRecentExamTopicMock.mockResolvedValue({ ...recentTopic, taskType: "TASK_3" });

    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_2")
    );

    expect(response.status).toBe(502);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
