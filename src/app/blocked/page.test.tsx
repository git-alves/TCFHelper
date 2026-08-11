import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { getCurrentBlockedSessionIdMock, redirectMock } = vi.hoisted(() => ({
  getCurrentBlockedSessionIdMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/components/blocked-account-modal", () => ({
  BlockedAccountModal: ({ sessionId }: { sessionId: string }) => (
    <div data-testid="blocked-account-modal" data-session-id={sessionId} />
  ),
}));
vi.mock("@/lib/blocked-user", () => ({
  getCurrentBlockedSessionId: getCurrentBlockedSessionIdMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const { default: BlockedPage } = await import("./page");

beforeEach(() => {
  getCurrentBlockedSessionIdMock.mockReset();
  redirectMock.mockReset();
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("/blocked", () => {
  it("mounts the recovery modal only for a verified blocked session", async () => {
    getCurrentBlockedSessionIdMock.mockResolvedValue("sess_blocked_1");

    const page = await BlockedPage();
    expect(renderToStaticMarkup(page)).toContain('data-testid="blocked-account-modal"');
    expect(renderToStaticMarkup(page)).toContain('data-session-id="sess_blocked_1"');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not show the modal to an unblocked visitor who opens the public URL directly", async () => {
    getCurrentBlockedSessionIdMock.mockResolvedValue(null);

    await expect(BlockedPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("fails safely home if the blocked-state lookup is unavailable", async () => {
    getCurrentBlockedSessionIdMock.mockRejectedValue(new Error("database unavailable"));

    await expect(BlockedPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
