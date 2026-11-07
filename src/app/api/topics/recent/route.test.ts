import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
        previouslyPublished: false,
        practicePrompt: false,
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

  // The route reads two different pools through the same findMany: stored
  // recent-exam topics, then the practice bank. Answer each by its `source`.
  function mockTopics({ recent = [], practice = [] }: { recent?: unknown[]; practice?: unknown[] }) {
    findManyMock.mockImplementation(async (args: { where: { source: string } }) =>
      args.where.source === "RECENT_EXAM" ? recent : practice,
    );
  }

  describe("when the live source cannot be used", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-07T12:00:00Z"));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

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
      mockTopics({ recent: [stored("t_old", "2026-09"), stored("t_new", "2026-10")] });

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.topic).toMatchObject({
        id: "t_new",
        taskType: "TASK_2",
        sourceMonth: "2026-10",
        sourceUrl: "https://reussir-tcfcanada.com/2026-10/",
        previouslyPublished: true,
      });
      expect(body.topic.guideContext).toBeDefined();
      expect(upsertMock).not.toHaveBeenCalled();
      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ source: "RECENT_EXAM", taskType: "TASK_2", retiredAt: null }),
        }),
      );
    });

    it("flags a live topic as not previously published", async () => {
      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect((await response.json()).topic.previouslyPublished).toBe(false);
    });

    it("offers a stored topic from exactly the oldest month inside the window", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      mockTopics({ recent: [stored("edge", "2026-05")] });

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect(response.status).toBe(200);
      expect((await response.json()).topic).toMatchObject({ id: "edge", sourceMonth: "2026-05", previouslyPublished: true });
    });

    it("refuses stored topics older than the window instead of presenting stale exam content", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      mockTopics({ recent: [stored("stale", "2026-04"), stored("ancient", "2024-01")] });

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect(response.status).toBe(502);
    });

    it("skips over-age rows but still serves a fresher one from the same lookup", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      mockTopics({ recent: [stored("stale", "2025-12"), stored("fresh", "2026-08")] });

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect((await response.json()).topic.id).toBe("fresh");
    });

    it("applies the window across a year boundary", async () => {
      vi.setSystemTime(new Date("2027-02-10T12:00:00Z"));
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      mockTopics({ recent: [stored("inside", "2026-08"), stored("outside", "2026-07")] });

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect((await response.json()).topic.id).toBe("inside");
    });

    it("prefers an editorial guide context on the stored topic", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      mockTopics({ recent: [stored("t1", "2026-10", { guideContext: "INFORMAL_PERSONAL_MESSAGE" })] });

      const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

      expect((await response.json()).topic.guideContext).toEqual({
        profile: "INFORMAL_PERSONAL_MESSAGE",
        confidence: "deterministic",
      });
    });

    it("ignores stored rows that lack a parsable source month", async () => {
      getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
      mockTopics({ recent: [stored("bad", "2026-10", { externalRef: "something-else" })] });

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

    describe("practice bank", () => {
      const bank = (id: string, over: Record<string, unknown> = {}) => ({
        id,
        taskType: "TASK_2",
        title: `Practice ${id}`,
        prompt: `Rédigez un article ${id}.`,
        guideContext: "PUBLIC_ARTICLE_OR_NOTE",
        ...over,
      });

      it("serves a random practice prompt, labelled as such, when no recent topic is stored", async () => {
        getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
        mockTopics({ practice: [bank("p1"), bank("p2")] });
        vi.spyOn(Math, "random").mockReturnValue(0.99);

        const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

        expect(response.status).toBe(200);
        const { topic } = await response.json();
        expect(topic).toMatchObject({
          id: "p2",
          title: "Practice p2",
          sourceUrl: null,
          sourceMonth: null,
          practicePrompt: true,
          previouslyPublished: false,
          guideContext: { profile: "PUBLIC_ARTICLE_OR_NOTE", confidence: "deterministic" },
        });
        expect(findManyMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            where: { taskType: "TASK_2", source: "OFFICIAL_EXAM", retiredAt: null },
          }),
        );
        vi.restoreAllMocks();
      });

      it("picks different prompts across clicks", async () => {
        getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
        mockTopics({ practice: [bank("p1"), bank("p2"), bank("p3")] });
        const random = vi.spyOn(Math, "random");
        const seen = new Set<string>();

        for (const roll of [0, 0.4, 0.8]) {
          random.mockReturnValue(roll);
          const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));
          seen.add((await response.json()).topic.id);
        }

        expect(seen).toEqual(new Set(["p1", "p2", "p3"]));
        vi.restoreAllMocks();
      });

      it("prefers a stored recent exam topic over the practice bank", async () => {
        getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
        mockTopics({ recent: [stored("t_recent", "2026-10")], practice: [bank("p1")] });

        const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

        expect((await response.json()).topic).toMatchObject({ id: "t_recent", practicePrompt: false, previouslyPublished: true });
      });

      it("falls to the practice bank, not an over-age exam topic", async () => {
        getRecentExamTopicMock.mockRejectedValue(new Error("source down"));
        mockTopics({ recent: [stored("stale", "2025-01")], practice: [bank("p1")] });

        const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

        expect((await response.json()).topic).toMatchObject({ id: "p1", practicePrompt: true });
      });

      it("serves a practice prompt, not an older exam topic, when the month is simply not published yet", async () => {
        getRecentExamTopicMock.mockRejectedValue(new RecentExamTopicErrorMock("NOT_PUBLISHED", "not yet"));
        mockTopics({ recent: [stored("t_recent", "2026-10")], practice: [bank("p1")] });

        const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

        expect(response.status).toBe(200);
        expect((await response.json()).topic).toMatchObject({ id: "p1", practicePrompt: true });
      });

      it("keeps the not-published 404 when the practice bank is empty too", async () => {
        getRecentExamTopicMock.mockRejectedValue(new RecentExamTopicErrorMock("NOT_PUBLISHED", "not yet"));

        const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

        expect(response.status).toBe(404);
      });

      it("still fails with unavailable when neither pool has anything", async () => {
        getRecentExamTopicMock.mockRejectedValue(new Error("source down"));

        const response = await GET(new Request("http://localhost/api/topics/recent?taskType=TASK_2"));

        expect(response.status).toBe(502);
      });
    });
  });
});
