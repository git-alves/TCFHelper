import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, recordPracticeCompletionMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}
  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    recordPracticeCompletionMock: vi.fn(),
  };
});

vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/practice-progress", () => ({
  recordPracticeCompletion: recordPracticeCompletionMock,
}));

const { POST } = await import("./route");

const USER_ID = "learner_1";
const SESSION_ID = "practice_session_1";
const validBody = { exerciseId: "t1-b2-salutations-1", completionMethod: "correct" };

function post(body: unknown) {
  return POST(
    new Request(`http://localhost/api/practice/sessions/${SESSION_ID}/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ sessionId: SESSION_ID }) },
  );
}

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  recordPracticeCompletionMock.mockReset();
  getCurrentActivatedAppUserMock.mockResolvedValue({ id: USER_ID });
  recordPracticeCompletionMock.mockResolvedValue({ kind: "recorded", sequenceCompleted: false });
});

describe("POST /api/practice/sessions/[sessionId]/completions", () => {
  it("requires an activated learner", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await post(validBody);

    expect(response.status).toBe(401);
    expect(recordPracticeCompletionMock).not.toHaveBeenCalled();
  });

  it("rejects malformed completion methods", async () => {
    const response = await post({ ...validBody, completionMethod: "guessed" });

    expect(response.status).toBe(400);
    expect(recordPracticeCompletionMock).not.toHaveBeenCalled();
  });

  it("records completion only against the signed-in learner's session", async () => {
    const response = await post(validBody);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ sequenceCompleted: false });
    expect(recordPracticeCompletionMock).toHaveBeenCalledWith(USER_ID, SESSION_ID, validBody.exerciseId, validBody.completionMethod);
  });

  it("does not disclose another learner's session", async () => {
    recordPracticeCompletionMock.mockResolvedValue({ kind: "not-found" });

    const response = await post(validBody);

    expect(response.status).toBe(404);
  });

  it("rejects an exercise that does not belong to the reviewed session", async () => {
    recordPracticeCompletionMock.mockResolvedValue({ kind: "invalid" });

    const response = await post(validBody);

    expect(response.status).toBe(400);
  });
});
