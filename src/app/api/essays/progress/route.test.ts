import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, getEssayProgressPointsMock } = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}
  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    getEssayProgressPointsMock: vi.fn(),
  };
});

vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/essay-progress", () => ({
  getEssayProgressPoints: getEssayProgressPointsMock,
}));

import { GET } from "./route";

const LOCAL_USER_ID = "learner_1";

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  getEssayProgressPointsMock.mockReset();
});

describe("GET /api/essays/progress", () => {
  it("returns 401 when the learner is not activated", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getEssayProgressPointsMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the account is still being provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock());

    const response = await GET();

    expect(response.status).toBe(503);
    expect(getEssayProgressPointsMock).not.toHaveBeenCalled();
  });

  it("scopes the query strictly to the authenticated user's own id", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
    getEssayProgressPointsMock.mockResolvedValue([]);

    await GET();

    expect(getEssayProgressPointsMock).toHaveBeenCalledWith(LOCAL_USER_ID);
    expect(getEssayProgressPointsMock).toHaveBeenCalledTimes(1);
  });

  it("returns only graph-safe point fields, never essay or feedback text", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
    getEssayProgressPointsMock.mockResolvedValue([
      {
        id: "essay_1",
        assessedAt: "2026-08-01T00:00:00.000Z",
        taskType: "TASK_1",
        cefrLevel: "B2",
        cefrRank: 4,
        wordCount: 90,
        meetsWordCount: true,
      },
    ]);

    const response = await GET();
    const body: unknown = await response.json();

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(body).toEqual({
      points: [
        {
          id: "essay_1",
          assessedAt: "2026-08-01T00:00:00.000Z",
          taskType: "TASK_1",
          cefrLevel: "B2",
          cefrRank: 4,
          wordCount: 90,
          meetsWordCount: true,
        },
      ],
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("content");
    expect(serialized).not.toContain("summary");
    expect(serialized).not.toContain("topic");
  });
});
