import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, createPracticeSessionMock, clearPracticeProgressMock } =
  vi.hoisted(() => {
    class AppUserProvisioningErrorMock extends Error {}
    return {
      getCurrentActivatedAppUserMock: vi.fn(),
      AppUserProvisioningErrorMock,
      createPracticeSessionMock: vi.fn(),
      clearPracticeProgressMock: vi.fn(),
    };
  });

vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/practice-progress", () => ({
  createPracticeSession: createPracticeSessionMock,
  clearPracticeProgress: clearPracticeProgressMock,
}));

const { POST, DELETE } = await import("./route");

const USER_ID = "learner_1";
const validBody = {
  task: "TASK_1",
  level: "B2",
  skillId: "salutations",
  exerciseIds: ["t1-b2-salutations-1", "t1-b2-salutations-2", "t1-b2-salutations-3", "t1-b2-salutations-4", "t1-b2-salutations-5", "t1-b2-salutations-6"],
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/practice/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  createPracticeSessionMock.mockReset();
  clearPracticeProgressMock.mockReset();
  getCurrentActivatedAppUserMock.mockResolvedValue({ id: USER_ID });
  createPracticeSessionMock.mockResolvedValue({ id: "practice_session_1" });
  clearPracticeProgressMock.mockResolvedValue(undefined);
});

describe("POST /api/practice/sessions", () => {
  it("requires an activated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await post(validBody);

    expect(response.status).toBe(401);
    expect(createPracticeSessionMock).not.toHaveBeenCalled();
  });

  it("fails closed while a Clerk identity cannot be safely provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock());

    const response = await post(validBody);

    expect(response.status).toBe(503);
    expect(createPracticeSessionMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed session before it reaches the persistence layer", async () => {
    const response = await post({ ...validBody, exerciseIds: ["only-one"] });

    expect(response.status).toBe(400);
    expect(createPracticeSessionMock).not.toHaveBeenCalled();
  });

  it("creates a server-validated session only for the authenticated learner", async () => {
    const response = await post(validBody);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ sessionId: "practice_session_1" });
    expect(createPracticeSessionMock).toHaveBeenCalledWith(USER_ID, validBody);
  });

  it("rejects a stale or unreviewed curriculum selection", async () => {
    createPracticeSessionMock.mockResolvedValue(null);

    const response = await post(validBody);

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/practice/sessions", () => {
  it("requires an activated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await DELETE();

    expect(response.status).toBe(401);
    expect(clearPracticeProgressMock).not.toHaveBeenCalled();
  });

  it("fails closed while a Clerk identity cannot be safely provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock());

    const response = await DELETE();

    expect(response.status).toBe(503);
    expect(clearPracticeProgressMock).not.toHaveBeenCalled();
  });

  it("clears every practice session for the authenticated learner", async () => {
    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(clearPracticeProgressMock).toHaveBeenCalledWith(USER_ID);
  });
});
