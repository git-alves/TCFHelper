import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueMock = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { accessCode: { findUnique: findUniqueMock } } }));

const { getAccessExpiryNotice } = await import("./access-expiry-notice");
const now = new Date("2026-08-01T12:00:00.000Z");
const learner = { id: "learner_1", isAdmin: false, timezone: "UTC" };

beforeEach(() => findUniqueMock.mockReset());

describe("getAccessExpiryNotice", () => {
  it.each([[8, null], [7, 7], [1, 1], [0, 0], [-1, null]])("handles a %i-day expiry", async (days, expectedDays) => {
    findUniqueMock.mockResolvedValue({ id: "code_1", redeemedAt: now, validityDays: 30, expiresAt: new Date(Date.UTC(2026, 7, 1 + days, 18)) });
    await expect(getAccessExpiryNotice(learner, now)).resolves.toMatchObject(expectedDays === null ? null : { days: expectedDays });
  });

  it("never warns for a lifetime code or admin", async () => {
    findUniqueMock.mockResolvedValue({ id: "code_lifetime", redeemedAt: now, validityDays: null, expiresAt: null });
    await expect(getAccessExpiryNotice(learner, now)).resolves.toBeNull();
    await expect(getAccessExpiryNotice({ ...learner, isAdmin: true }, now)).resolves.toBeNull();
    expect(findUniqueMock).toHaveBeenCalledTimes(1);
  });
});
