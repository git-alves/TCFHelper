import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentClerkUserIdMock, redirectMock } = vi.hoisted(() => ({
  getCurrentClerkUserIdMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/app-user", () => ({ getCurrentClerkUserId: getCurrentClerkUserIdMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { redirectForUnauthenticatedOrBlockedUser } = await import("./blocked-user-redirect");

beforeEach(() => {
  getCurrentClerkUserIdMock.mockReset();
  redirectMock.mockReset();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("redirectForUnauthenticatedOrBlockedUser", () => {
  it("sends an anonymous visitor to login with a safe encoded callback", async () => {
    getCurrentClerkUserIdMock.mockResolvedValue(null);

    await expect(redirectForUnauthenticatedOrBlockedUser("/dashboard/history/essay_1?tab=review")).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirectMock).toHaveBeenCalledWith(
      "/login?callbackUrl=%2Fdashboard%2Fhistory%2Fessay_1%3Ftab%3Dreview",
    );
  });

  it("uses the sign-out bridge for a blocked Clerk session", async () => {
    getCurrentClerkUserIdMock.mockResolvedValue("user_clerk_blocked");

    await expect(redirectForUnauthenticatedOrBlockedUser("/tasks")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/blocked");
  });
});
