import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AdminUserListItem } from "@/lib/admin-users";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { AdminUsersTable } = await import("./admin-users-table");

const BASE_USAGE = {
  translation: { currentMinuteRequests: 0, currentMinuteCharacters: 0, currentMonthCharacters: 0 },
  examples: { currentDayRequests: 0 },
  corrections: { currentDayRequests: 0, currentMonthRequests: 0 },
};

function user(overrides: Partial<AdminUserListItem>): AdminUserListItem {
  return {
    id: "user_1",
    email: "learner@example.com",
    name: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    lastSignInAt: null,
    lastActiveAt: null,
    timezone: null,
    isAdmin: false,
    isBlocked: false,
    activatedAt: null,
    hasLiveAdmission: false,
    usage: BASE_USAGE,
    ...overrides,
  };
}

function renderUsers(users: AdminUserListItem[]) {
  return renderToStaticMarkup(createElement(AdminUsersTable, { users, currentAdminId: "owner_1" }));
}

describe("AdminUsersTable", () => {
  it("shows last sign-in and activity in UTC for every learner, whatever their own timezone", () => {
    const markup = renderUsers([
      user({
        id: "user_sp",
        lastSignInAt: "2026-10-22T23:30:00.000Z",
        lastActiveAt: "2026-10-23T08:15:00.000Z",
        timezone: "America/Sao_Paulo",
      }),
      user({ id: "user_tokyo", lastSignInAt: "2026-10-22T23:30:00.000Z", timezone: "Asia/Tokyo" }),
    ]);

    expect(markup).toContain("Last sign-in (UTC)");
    // Same instant, same text for both learners, regardless of zone.
    expect(markup.match(/Oct 22, 2026, 11:30 PM/g)).toHaveLength(2);
    expect(markup).toContain("Oct 23, 2026, 8:15 AM");
    expect(markup).not.toContain("8:30 PM");
  });

  it("says plainly when no sign-in has been recorded yet instead of implying they never signed in", () => {
    const markup = renderUsers([user({ lastSignInAt: null, lastActiveAt: null })]);

    expect(markup).toContain("Not recorded yet");
    expect(markup).not.toContain("Never");
  });

  it("shows a green Activated badge for a live admission", () => {
    const markup = renderUsers([
      user({ activatedAt: "2026-08-05T00:00:00.000Z", hasLiveAdmission: true }),
    ]);

    expect(markup).toContain("Activated");
    expect(markup).not.toContain("Access expired");
  });

  it("shows a distinct Access expired badge for a redeemed timed code that is no longer live, instead of the green Activated badge", () => {
    // A timed code past its derived expiry (redeemedAt + validityDays)
    // stays attached in the DB until the learner's own next request lazily
    // detaches it -- activatedAt is still set from the historical
    // redemption, but hasLiveAdmission must be false, and the badge must
    // reflect that rather than showing the same green tag as a live user.
    const markup = renderUsers([
      user({ activatedAt: "2026-07-01T00:00:00.000Z", hasLiveAdmission: false }),
    ]);

    expect(markup).toContain("Access expired");
    expect(markup).not.toContain(">Activated<");
  });

  it("shows Needs code for a user who has never redeemed anything", () => {
    const markup = renderUsers([user({ activatedAt: null, hasLiveAdmission: false })]);

    expect(markup).toContain("Needs code");
    expect(markup).not.toContain("Access expired");
    expect(markup).not.toContain(">Activated<");
  });

  it("shows both today's and this month's Corrections count, matching the per-user detail page", () => {
    const markup = renderUsers([
      user({
        usage: {
          ...BASE_USAGE,
          corrections: { currentDayRequests: 3, currentMonthRequests: 41 },
        },
      }),
    ]);

    expect(markup).toContain("Corrections: 3 today");
    expect(markup).toContain("41 this month");
  });

  it("prioritizes the Blocked and Owner access badges over live-admission state", () => {
    const blockedMarkup = renderUsers([
      user({ isBlocked: true, activatedAt: "2026-08-05T00:00:00.000Z", hasLiveAdmission: true }),
    ]);
    expect(blockedMarkup).toContain("Blocked");
    expect(blockedMarkup).not.toContain(">Activated<");

    const ownerMarkup = renderUsers([user({ isAdmin: true, hasLiveAdmission: false })]);
    expect(ownerMarkup).toContain("Owner access");
    expect(ownerMarkup).not.toContain("Needs code");
  });
});
