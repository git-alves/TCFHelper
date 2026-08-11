import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentClerkRequestIdentityMock, findUniqueMock } = vi.hoisted(() => ({
  getCurrentClerkRequestIdentityMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/app-user", () => ({
  getCurrentClerkRequestIdentity: getCurrentClerkRequestIdentityMock,
}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: findUniqueMock } } }));

const { getCurrentBlockedSessionId, isCurrentRequestBlocked } = await import("./blocked-user");

beforeEach(() => {
  getCurrentClerkRequestIdentityMock.mockReset();
  findUniqueMock.mockReset();
  getCurrentClerkRequestIdentityMock.mockResolvedValue({
    userId: "user_clerk_1",
    sessionId: "sess_blocked_1",
  });
  findUniqueMock.mockResolvedValue(null);
});

describe("isCurrentRequestBlocked", () => {
  it("does not query the local account store for an anonymous request", async () => {
    getCurrentClerkRequestIdentityMock.mockResolvedValue({ userId: null, sessionId: null });

    await expect(isCurrentRequestBlocked()).resolves.toBe(false);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("recognizes a blocked mapped Clerk session", async () => {
    findUniqueMock.mockResolvedValue({ isBlocked: true });

    await expect(isCurrentRequestBlocked()).resolves.toBe(true);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { clerkUserId: "user_clerk_1" },
      select: { isBlocked: true },
    });
  });

  it("leaves an active, unblocked session alone", async () => {
    findUniqueMock.mockResolvedValue({ isBlocked: false });

    await expect(isCurrentRequestBlocked()).resolves.toBe(false);
  });

  it("returns the exact verified blocked session for a scoped browser sign-out", async () => {
    findUniqueMock.mockResolvedValue({ isBlocked: true });

    await expect(getCurrentBlockedSessionId()).resolves.toBe("sess_blocked_1");
  });

  it("does not resolve a session ID when Clerk has no active session", async () => {
    getCurrentClerkRequestIdentityMock.mockResolvedValue({ userId: "user_clerk_1", sessionId: null });

    await expect(getCurrentBlockedSessionId()).resolves.toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
