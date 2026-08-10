import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { DEFAULT_USER_QUOTA_LIMITS, resolveUserQuotaLimits } = await import("./user-quota-limits");

describe("resolveUserQuotaLimits", () => {
  it("uses the global defaults when a learner has no override row", () => {
    expect(resolveUserQuotaLimits(null)).toEqual(DEFAULT_USER_QUOTA_LIMITS);
  });

  it("uses only supplied per-API overrides", () => {
    expect(
      resolveUserQuotaLimits({
        translationRequestsPerMinute: 4,
        correctionRequestsPerDay: 2,
      }),
    ).toEqual({
      ...DEFAULT_USER_QUOTA_LIMITS,
      translationRequestsPerMinute: 4,
      correctionRequestsPerDay: 2,
    });
  });

  it("keeps zero as an intentional quota disablement", () => {
    expect(resolveUserQuotaLimits({ exampleGenerationsPerDay: 0 }).exampleGenerationsPerDay).toBe(0);
  });
});
