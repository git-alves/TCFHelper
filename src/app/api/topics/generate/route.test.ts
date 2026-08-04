import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentAppUserMock,
  AppUserProvisioningErrorMock,
  findManyMock,
  upsertMock,
  generateTopicMock,
  generateTopicImageMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    findManyMock: vi.fn(),
    upsertMock: vi.fn(),
    generateTopicMock: vi.fn(),
    generateTopicImageMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { topic: { findMany: findManyMock, upsert: upsertMock } },
}));
vi.mock("@/lib/topic-generator", () => ({
  generateTopic: generateTopicMock,
  TopicGenerationError: class TopicGenerationError extends Error {},
}));
vi.mock("@/lib/topic-image", () => ({
  generateTopicImage: generateTopicImageMock,
}));

const { POST } = await import("./route");

const LOCAL_USER_ID = "cuid_local_user_1";

const generatedTask3 = {
  taskType: "TASK_3",
  title: "Le télétravail généralisé",
  prompt:
    "Le télétravail généralisé\n\nDocument 1 :\nLe télétravail améliore l'équilibre de vie.\n\nDocument 2 :\nLe télétravail isole les employés.",
  imagePrompt: "A tidy home office desk with a laptop, generic and unbranded.",
  externalRef: "ai-generated:TASK_3:abc123",
};

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  findManyMock.mockReset();
  upsertMock.mockReset();
  generateTopicMock.mockReset();
  generateTopicImageMock.mockReset();
  delete process.env.OPENAI_API_KEY;

  getCurrentAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
  findManyMock.mockResolvedValue([]);
  generateTopicMock.mockResolvedValue(generatedTask3);
  generateTopicImageMock.mockResolvedValue({ dataUrl: "data:image/png;base64,AAA" });
  upsertMock.mockResolvedValue({
    id: "topic_generated_1",
    taskType: "TASK_3",
    title: generatedTask3.title,
    prompt: generatedTask3.prompt,
    imageData: null,
    imageAlt: null,
  });
});

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/topics/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/topics/generate", () => {
  it("requires an authenticated learner", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await post({ taskType: "TASK_1" });

    expect(response.status).toBe(401);
    expect(generateTopicMock).not.toHaveBeenCalled();
  });

  it("fails closed while a Clerk identity cannot be safely provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(
      new AppUserProvisioningErrorMock("identity cannot be linked"),
    );

    const response = await post({ taskType: "TASK_1" });

    expect(response.status).toBe(503);
    expect(generateTopicMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid task type before touching the database or Claude", async () => {
    const response = await post({ taskType: "TASK_4" });

    expect(response.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
    expect(generateTopicMock).not.toHaveBeenCalled();
  });

  it("reuses an existing generated topic this learner has not used yet instead of generating one", async () => {
    findManyMock.mockResolvedValue([
      { id: "topic_pool_1", taskType: "TASK_1", title: "A", prompt: "B", imageData: null, imageAlt: null },
    ]);

    const response = await post({ taskType: "TASK_1" });

    expect(response.status).toBe(200);
    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        taskType: "TASK_1",
        source: "AI_GENERATED",
        essays: { none: { userId: LOCAL_USER_ID } },
      },
      select: { id: true, taskType: true, title: true, prompt: true, imageData: true, imageAlt: true },
    });
    expect(generateTopicMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      topic: { id: "topic_pool_1", taskType: "TASK_1", title: "A", prompt: "B", imageData: null, imageAlt: null },
      reused: true,
    });
  });

  it("generates and persists a new topic when the pool has nothing left for this learner", async () => {
    const response = await post({ taskType: "TASK_3" });

    expect(response.status).toBe(200);
    expect(generateTopicMock).toHaveBeenCalledWith("TASK_3");
    expect(upsertMock).toHaveBeenCalledWith({
      where: { externalRef: generatedTask3.externalRef },
      create: {
        taskType: "TASK_3",
        title: generatedTask3.title,
        prompt: generatedTask3.prompt,
        source: "AI_GENERATED",
        externalRef: generatedTask3.externalRef,
        imageData: null,
        imageAlt: null,
      },
      update: {},
      select: { id: true, taskType: true, title: true, prompt: true, imageData: true, imageAlt: true },
    });
    await expect(response.json()).resolves.toMatchObject({ reused: false });
  });

  it("generates an image for a Task 3 topic when an image API key is configured", async () => {
    process.env.OPENAI_API_KEY = "sk-test";

    const response = await post({ taskType: "TASK_3" });

    expect(response.status).toBe(200);
    expect(generateTopicImageMock).toHaveBeenCalledWith(
      generatedTask3.imagePrompt,
      "sk-test",
      expect.anything(),
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          imageData: "data:image/png;base64,AAA",
          imageAlt: generatedTask3.title,
        }),
      }),
    );
  });

  it("never requests an image for Task 1 or Task 2", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    generateTopicMock.mockResolvedValue({
      taskType: "TASK_1",
      title: "Un message à un ami",
      prompt: "Écrivez un message à un ami pour lui proposer une sortie.",
      externalRef: "ai-generated:TASK_1:def456",
    });

    const response = await post({ taskType: "TASK_1" });

    expect(response.status).toBe(200);
    expect(generateTopicImageMock).not.toHaveBeenCalled();
  });

  it("persists a Task 3 topic without an image when image generation fails", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    generateTopicImageMock.mockRejectedValue(new Error("image API unavailable"));

    const response = await post({ taskType: "TASK_3" });

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ imageData: null, imageAlt: null }),
      }),
    );
  });

  it("returns a retryable error when topic generation fails", async () => {
    generateTopicMock.mockRejectedValue(new Error("Claude refused"));

    const response = await post({ taskType: "TASK_2" });

    expect(response.status).toBe(502);
    expect(upsertMock).not.toHaveBeenCalled();
  });
});
