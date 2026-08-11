import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminUserDetail } from "./admin-user-detail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const baseUser = {
  id: "learner_1",
  email: "learner@example.com",
  name: "Learner Example",
  createdAt: "2026-08-10T12:00:00.000Z",
  isAdmin: false,
  isBlocked: false,
  activatedAt: "2026-08-10T12:05:00.000Z",
  hasLiveAdmission: true,
  usage: {
    translation: {
      currentMinuteRequests: 2,
      currentMinuteCharacters: 300,
      currentMonthCharacters: 4_000,
    },
    examples: { currentDayRequests: 3 },
    corrections: { currentDayRequests: 1, currentMonthRequests: 8 },
  },
  quotaOverride: {
    translationRequestsPerMinute: null,
    translationCharactersPerMinute: null,
    translationCharactersPerMonth: null,
    exampleGenerationsPerDay: 4,
    correctionRequestsPerDay: null,
  },
  effectiveQuotaLimits: {
    translationRequestsPerMinute: 20,
    translationCharactersPerMinute: 20_000,
    translationCharactersPerMonth: 100_000,
    exampleGenerationsPerDay: 4,
    correctionRequestsPerDay: 10,
  },
};

describe("AdminUserDetail", () => {
  it("makes quota, activation reset, and the risky block action understandable", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminUserDetail, { user: baseUser, currentAdminId: "owner_1" }),
    );

    expect(markup).toContain("Quota overrides");
    expect(markup).toContain("Leave a field blank to use the global default");
    expect(markup).toContain("Enter <strong>0</strong> to pause only that API");
    expect(markup).toContain("Activation");
    expect(markup).toContain("Deactivate access");
    expect(markup).toContain("code they used remains permanently spent");
    expect(markup).toContain("Block user");
    expect(markup).toContain("Current API usage");
  });

  it("removes the self-block action for the owner account", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminUserDetail, {
        user: { ...baseUser, id: "owner_1", isAdmin: true },
        currentAdminId: "owner_1",
      }),
    );

    expect(markup).toContain("Owner account");
    expect(markup).toContain("Owner access");
    expect(markup).not.toContain("Awaiting access code");
    expect(markup).toContain("cannot be blocked");
    expect(markup).not.toContain("Block user");
    expect(markup).not.toContain("Deactivate access");
  });

  it("shows a distinct Access expired badge for a redeemed timed code that is no longer live, instead of the green Activated badge", () => {
    // Mirrors the AdminUsersTable fix: activatedAt alone is a historical
    // timestamp that survives past a timed code's derived expiry (the row
    // stays attached until the learner's own next request lazily detaches
    // it) -- the badge must reflect hasLiveAdmission, not activatedAt
    // truthiness, or an expired learner reads as still having access.
    const markup = renderToStaticMarkup(
      createElement(AdminUserDetail, {
        user: { ...baseUser, activatedAt: "2026-07-01T00:00:00.000Z", hasLiveAdmission: false },
        currentAdminId: "owner_1",
      }),
    );

    expect(markup).toContain("Access expired");
    expect(markup).not.toContain(">Activated ");
  });

  it("shows a learner who was deactivated that a new code is required", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminUserDetail, {
        user: { ...baseUser, activatedAt: null, hasLiveAdmission: false },
        currentAdminId: "owner_1",
      }),
    );

    expect(markup).toContain("Awaiting access code");
    expect(markup).toContain("Awaiting new code");
    expect(markup).toContain("awaiting a newly issued access code");
    expect(markup).not.toContain("Deactivate access");
  });
});
