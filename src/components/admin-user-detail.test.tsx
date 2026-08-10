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
  it("makes the quota fallback and the risky block action understandable", () => {
    const markup = renderToStaticMarkup(
      createElement(AdminUserDetail, { user: baseUser, currentAdminId: "owner_1" }),
    );

    expect(markup).toContain("Quota overrides");
    expect(markup).toContain("Leave a field blank to use the global default");
    expect(markup).toContain("Enter <strong>0</strong> to pause only that API");
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
  });
});
