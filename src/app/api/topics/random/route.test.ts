import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, findManyMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}
  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    findManyMock: vi.fn(),
  };
});

vi.mock("@/lib/activated-app-user", () => ({ getCurrentActivatedAppUser: getCurrentActivatedAppUserMock }));
vi.mock("@/lib/app-user", () => ({ AppUserProvisioningError: AppUserProvisioningErrorMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { topic: { findMany: findManyMock } } }));

const { GET } = await import("./route");

const bank = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  taskType: "TASK_2",
  title: `Sujet ${id}`,
  prompt: `Rédigez un article ${id} : racontez une expérience et donnez votre avis.`,
  guideContext: "PUBLIC_ARTICLE_OR_NOTE",
  ...over,
});

const request = (taskType = "TASK_2", excludeTopicId?: string) => {
  const query = new URLSearchParams({ taskType });
  if (excludeTopicId) query.set("excludeTopicId", excludeTopicId);
  return new Request(`http://localhost/api/topics/random?${query}`);
};

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  findManyMock.mockReset();
  getCurrentActivatedAppUserMock.mockResolvedValue({ id: "learner_1" });
  findManyMock.mockResolvedValue([bank("t1"), bank("t2"), bank("t3")]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/topics/random", () => {
  it("returns one topic from the database bank, shaped for the topic card", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      topic: {
        id: "t2",
        taskType: "TASK_2",
        title: "Sujet t2",
        prompt: bank("t2").prompt,
        guideContext: { profile: "PUBLIC_ARTICLE_OR_NOTE", confidence: "deterministic" },
      },
    });
  });

  it("reaches every topic in the bank across clicks", async () => {
    const random = vi.spyOn(Math, "random");
    const seen = new Set<string>();

    for (const roll of [0, 0.4, 0.9]) {
      random.mockReturnValue(roll);
      seen.add((await (await GET(request())).json()).topic.id);
    }

    expect(seen).toEqual(new Set(["t1", "t2", "t3"]));
  });

  it("does not return the topic the learner is replacing when another one exists", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const { topic } = await (await GET(request("TASK_2", "t1"))).json();

    expect(topic.id).toBe("t2");
  });

  it("still returns the sole topic when it is the one being replaced", async () => {
    findManyMock.mockResolvedValue([bank("t1")]);

    const response = await GET(request("TASK_2", "t1"));

    expect(response.status).toBe(200);
    expect((await response.json()).topic.id).toBe("t1");
  });

  it("reads only active starter-bank topics for the requested task", async () => {
    await GET(request("TASK_3"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { taskType: "TASK_3", source: "OFFICIAL_EXAM", retiredAt: null },
      }),
    );
  });

  it("falls back to the deterministic guide classifier when the topic has no editorial profile", async () => {
    findManyMock.mockResolvedValue([bank("t1", { guideContext: null })]);

    const { topic } = await (await GET(request())).json();

    expect(topic.guideContext.profile).toBeDefined();
    expect(topic.guideContext.confidence).toBeDefined();
  });

  it("never contacts an outside site or AI provider", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await GET(request());

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("reports that no topics exist when the bank is empty for the task", async () => {
    findManyMock.mockResolvedValue([]);

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "NO_TOPICS_AVAILABLE" });
  });

  it("rejects an invalid task type before touching the database", async () => {
    const response = await GET(request("TASK_4"));

    expect(response.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("requires an activated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("fails closed while the signed-in account cannot be provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock());

    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
