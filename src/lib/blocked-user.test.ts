import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentClerkUserIdMock, findUniqueMock } = vi.hoisted(() => ({
  getCurrentClerkUserIdMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/app-user", () => ({ getCurrentClerkUserId: getCurrentClerkUserIdMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: findUniqueMock } } }));

const { isCurrentRequestBlocked } = await import("./blocked-user");

beforeEach(() => {
  getCurrentClerkUserIdMock.mockReset();
  findUniqueMock.mockReset();
  getCurrentClerkUserIdMock.mockResolvedValue("user_clerk_1");
  findUniqueMock.mockResolvedValue(null);
});

describe("isCurrentRequestBlocked", () => {
  it("does not query the local account store for an anonymous request", async () => {
    getCurrentClerkUserIdMock.mockResolvedValue(null);

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
});
