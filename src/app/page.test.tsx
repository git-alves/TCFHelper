import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, isCurrentRequestBlockedMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  isCurrentRequestBlockedMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/blocked-user", () => ({ isCurrentRequestBlocked: isCurrentRequestBlockedMock }));
vi.mock("@/components/home-hero", () => ({ HomeHero: () => null }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { default: Home } = await import("./page");

beforeEach(() => {
  authMock.mockReset();
  isCurrentRequestBlockedMock.mockReset();
  redirectMock.mockReset();
  authMock.mockResolvedValue({ userId: "user_1" });
  isCurrentRequestBlockedMock.mockResolvedValue(false);
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("/", () => {
  it("routes a verified blocked session to the recovery modal", async () => {
    isCurrentRequestBlockedMock.mockResolvedValue(true);

    await expect(Home()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/blocked");
  });

  it("does not make a public-page outage look like a blocked account", async () => {
    isCurrentRequestBlockedMock.mockRejectedValue(new Error("database unavailable"));

    await expect(Home()).resolves.not.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
