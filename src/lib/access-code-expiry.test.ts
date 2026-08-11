import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { accessCodeIsLiveWhere, resolveExpiresAt } = await import("./access-code-expiry");

describe("resolveExpiresAt", () => {
  it("trusts a persisted expiresAt over recomputing it", () => {
    const persisted = new Date("2026-09-01T00:00:00.000Z");
    expect(
      resolveExpiresAt({ redeemedAt: new Date("2026-08-01T00:00:00.000Z"), validityDays: 7, expiresAt: persisted }),
    ).toBe(persisted);
  });

  it("treats a null expiresAt with null validityDays as genuinely lifetime", () => {
    expect(
      resolveExpiresAt({ redeemedAt: new Date("2026-08-01T00:00:00.000Z"), validityDays: null, expiresAt: null }),
    ).toBeNull();
  });

  it("derives a legacy row's expiry from redeemedAt + validityDays when expiresAt was never persisted", () => {
    // The mixed-version rollout gap: an app instance that predates the
    // expiresAt column wrote redeemedAt/validityDays but left expiresAt
    // unset. This must not be treated as lifetime.
    const redeemedAt = new Date("2026-08-01T00:00:00.000Z");
    const result = resolveExpiresAt({ redeemedAt, validityDays: 7, expiresAt: null });

    expect(result).toEqual(new Date("2026-08-08T00:00:00.000Z"));
  });

  it("returns null for an unredeemed row (defensive; should not occur for an attached admission)", () => {
    expect(resolveExpiresAt({ redeemedAt: null, validityDays: 7, expiresAt: null })).toBeNull();
  });
});

describe("accessCodeIsLiveWhere", () => {
  it("requires validityDays to also be null before trusting a null expiresAt as lifetime", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");

    expect(accessCodeIsLiveWhere(now)).toEqual({
      OR: [
        { expiresAt: null, validityDays: null },
        { expiresAt: { gt: now } },
      ],
    });
  });
});
