import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAppUserMock, hasRedeemedAccessCodeMock } = vi.hoisted(() => ({
  getCurrentAppUserMock: vi.fn(),
  hasRedeemedAccessCodeMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/app-user", () => ({ getCurrentAppUser: getCurrentAppUserMock }));
vi.mock("@/lib/access-code", () => ({ hasRedeemedAccessCode: hasRedeemedAccessCodeMock }));

const { getCurrentActivatedAppUser } = await import("./activated-app-user");

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  hasRedeemedAccessCodeMock.mockReset();
});

describe("getCurrentActivatedAppUser", () => {
  it("returns null without checking activation for an anonymous or blocked user", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    await expect(getCurrentActivatedAppUser()).resolves.toBeNull();
    expect(hasRedeemedAccessCodeMock).not.toHaveBeenCalled();
  });

  it("returns null for a signed-in learner that has not redeemed a code", async () => {
    getCurrentAppUserMock.mockResolvedValue({ id: "learner_1" });
    hasRedeemedAccessCodeMock.mockResolvedValue(false);

    await expect(getCurrentActivatedAppUser()).resolves.toBeNull();
    expect(hasRedeemedAccessCodeMock).toHaveBeenCalledWith("learner_1");
  });

  it("admits the unblocked owner without consuming an access code", async () => {
    const owner = { id: "owner_1", email: "owner@example.com", isAdmin: true };
    getCurrentAppUserMock.mockResolvedValue(owner);

    await expect(getCurrentActivatedAppUser()).resolves.toEqual(owner);
    expect(hasRedeemedAccessCodeMock).not.toHaveBeenCalled();
  });

  it("returns the activated application user", async () => {
    const user = { id: "learner_1", email: "learner@example.com" };
    getCurrentAppUserMock.mockResolvedValue(user);
    hasRedeemedAccessCodeMock.mockResolvedValue(true);

    await expect(getCurrentActivatedAppUser()).resolves.toEqual(user);
  });
});
