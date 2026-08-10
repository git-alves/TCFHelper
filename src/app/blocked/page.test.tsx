import { beforeEach, describe, expect, it, vi } from "vitest";

const { isCurrentRequestBlockedMock, redirectMock } = vi.hoisted(() => ({
  isCurrentRequestBlockedMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/components/blocked-session-sign-out", () => ({
  BlockedSessionSignOut: () => null,
}));
vi.mock("@/lib/blocked-user", () => ({
  isCurrentRequestBlocked: isCurrentRequestBlockedMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { default: BlockedPage } = await import("./page");

beforeEach(() => {
  isCurrentRequestBlockedMock.mockReset();
  redirectMock.mockReset();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("/blocked", () => {
  it("mounts the silent sign-out bridge only for a verified blocked session", async () => {
    isCurrentRequestBlockedMock.mockResolvedValue(true);

    await expect(BlockedPage()).resolves.not.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not sign out an unblocked visitor who opens the bridge URL directly", async () => {
    isCurrentRequestBlockedMock.mockResolvedValue(false);

    await expect(BlockedPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("fails safely home if the blocked-state lookup is unavailable", async () => {
    isCurrentRequestBlockedMock.mockRejectedValue(new Error("database unavailable"));

    await expect(BlockedPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
