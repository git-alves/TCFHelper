import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { isCurrentRequestBlockedMock, redirectMock } = vi.hoisted(() => ({
  isCurrentRequestBlockedMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("@/components/blocked-account-modal", () => ({
  BlockedAccountModal: () => <div data-testid="blocked-account-modal" />,
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
  it("mounts the recovery modal only for a verified blocked session", async () => {
    isCurrentRequestBlockedMock.mockResolvedValue(true);

    const page = await BlockedPage();
    expect(renderToStaticMarkup(page)).toContain('data-testid="blocked-account-modal"');
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("does not show the modal to an unblocked visitor who opens the public URL directly", async () => {
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
