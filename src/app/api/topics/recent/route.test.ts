import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentActivatedAppUserMock,
  AppUserProvisioningErrorMock,
  getRecentExamTopicMock,
  upsertMock,
  findManyMock,
  RecentExamTopicErrorMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}
  class RecentExamTopicErrorMock extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    getRecentExamTopicMock: vi.fn(),
    upsertMock: vi.fn(),
    findManyMock: vi.fn(),
    RecentExamTopicErrorMock,
  };
});

vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/app-user", () => ({ AppUserProvisioningError: AppUserProvisioningErrorMock }));
vi.mock("@/lib/recent-exam-topics", () => ({
  getRecentExamTopic: getRecentExamTopicMock,
  RecentExamTopicError: RecentExamTopicErrorMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { topic: { upsert: upsertMock, findMany: findManyMock } },
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
  getCurrentActivatedAppUserMock.mockReset();
  getRecentExamTopicMock.mockReset();
  upsertMock.mockReset();
  findManyMock.mockReset();
  findManyMock.mockResolvedValue([]);

  getCurrentActivatedAppUserMock.mockResolvedValue({ id: "learner_1" });
  getRecentExamTopicMock.mockResolvedValue(recentTopic);
  upsertMock.mockResolvedValue({
    id: "recent_topic_1",
    taskType: recentTopic.taskType,
    title: recentTopic.title,
    prompt: recentTopic.prompt,
    source: "RECENT_EXAM",
    sourceUrl: recentTopic.sourceUrl,
    guideContext: null,
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
        guideContext: true,
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
        // No editorial override on this freshly scraped row -- falls back to
        // the deterministic classifier, which can't tell article from public
        // letter for this prompt and asks the learner to confirm.
        guideContext: { profile: "PUBLIC_ARTICLE_OR_NOTE", confidence: "needs_confirmation" },
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

  it("requires an activated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_2")
    );

    expect(response.status).toBe(401);
    expect(getRecentExamTopicMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("fails closed while the signed-in account cannot be provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock());

    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_2"),
    );

    expect(response.status).toBe(503);
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
        "The recent-exam topic is unavailable. Please write or paste your own topic.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("returns a stable not-published code when neither month has a source page", async () => {
    getRecentExamTopicMock.mockRejectedValue(
      new RecentExamTopicErrorMock("NOT_PUBLISHED", "August 2026 has not been published yet."),
    );

    const response = await GET(
      new Request("http://localhost/api/topics/recent?taskType=TASK_2"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error:
        "No recent-exam topics have been published for this month or the previous month. Please write or paste your own topic.",
      code: "RECENT_EXAM_NOT_PUBLISHED",
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

  describe("when the live source cannot be used", () => {
    const stored = (id: string, month: string, over: Record<string, unknown> = {}) => ({
      id,
      taskType: "TASK_2",
      title: `Tâche 2 — ${id}`,
      prompt: `Prompt ${id}`,
      sourceUrl: `https://reussir-tcfcanada.com/${month}/`,
      externalRef: `reussir-tcf-canada:${month}:TASK_2:1:abc123`,
      guideContext: null,
      ...over,
    });

    it("serves a previously stored recent-exam topic instead of failing (bot-protection block, outage)", async () => {
      getRecentExamTopicMock.mockRejectedValue(
        new RecentExamTopicErrorMock("UNAVAILABLE", "The recent-exam source blocked the request."),
      );
      findManyMock.mockResolvedValue([stored("t_old", "2026-09"), stored("t_new", "2026-10")]);

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.topic).toMatchObject({
        id: "t_new",
        taskType: "TASK_2",
        sourceMonth: "2026-10",
        sourceUrl: "https://reussir-tcfcanada.com/2026-10/",
      });
      expect(body.topic.guideContext).toBeDefined();
      expect(upsertMock).not.toHaveBeenCalled();
      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ source: "RECENT_EXAM", taskType: "TASK_2", retiredAt: null }),
        }),
      );
    });

    it("prefers an editorial guide context on the stored topic", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      findManyMock.mockResolvedValue([stored("t1", "2026-10", { guideContext: "INFORMAL_PERSONAL_MESSAGE" })]);

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect((await response.json()).topic.guideContext).toEqual({
        profile: "INFORMAL_PERSONAL_MESSAGE",
        confidence: "deterministic",
      });
    });

    it("ignores stored rows that lack a parsable source month", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      findManyMock.mockResolvedValue([stored("bad", "2026-10", { externalRef: "something-else" })]);

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect(response.status).toBe(502);
    });

    it("still reports unavailable when nothing has been stored yet", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect(response.status).toBe(502);
    });

    it("still reports unavailable if the stored-topic lookup itself fails", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      findManyMock.mockRejectedValue(new Error("database down"));

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect(response.status).toBe(502);
    });

    it("does not substitute a stored topic when the month is simply not published yet", async () => {
      getRecentExamTopicMock.mockRejectedValue(new RecentExamTopicErrorMock("NOT_PUBLISHED", "not yet"));
      findManyMock.mockResolvedValue([stored("t1", "2026-10")]);

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect(response.status).toBe(404);
      expect(findManyMock).not.toHaveBeenCalled();
    });
  });
});
