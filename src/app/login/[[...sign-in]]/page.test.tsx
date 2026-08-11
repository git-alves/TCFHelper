import { beforeEach, describe, expect, it, vi } from "vitest";

const { isCurrentRequestBlockedMock, redirectMock } = vi.hoisted(() => ({
  isCurrentRequestBlockedMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({ SignIn: () => null }));
vi.mock("@/lib/blocked-user", () => ({ isCurrentRequestBlocked: isCurrentRequestBlockedMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { default: LoginPage } = await import("./page");

beforeEach(() => {
  isCurrentRequestBlockedMock.mockReset();
  redirectMock.mockReset();
  isCurrentRequestBlockedMock.mockResolvedValue(false);
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("/login", () => {
  it("routes a verified blocked session to the recovery modal before mounting Clerk", async () => {
    isCurrentRequestBlockedMock.mockResolvedValue(true);

    await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/blocked");
  });

  it("does not block sign-in if the blocked-state lookup is temporarily unavailable", async () => {
    isCurrentRequestBlockedMock.mockRejectedValue(new Error("database unavailable"));

    await expect(LoginPage({ searchParams: Promise.resolve({}) })).resolves.not.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
