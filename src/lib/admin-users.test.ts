import { beforeEach, describe, expect, it, vi } from "vitest";
import { accessCodeIsLiveWhere } from "@/lib/access-code-expiry";

const { countMock, findManyMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: countMock,
      findMany: findManyMock,
      findUnique: vi.fn(),
    },
  },
}));

const {
  getAdminUsersPage,
  getAdminUsersForExport,
  getCurrentAdminUsage,
  parseAdminUserListQuery,
  serializeQuotaOverride,
  MAX_USERS_EXPORT_ROWS,
} = await import("./admin-users");

function userRecord(overrides: {
  id?: string;
  redeemedAt?: Date | null;
  validityDays?: number | null;
  expiresAt?: Date | null;
}) {
  const hasRedemption =
    overrides.redeemedAt !== undefined || overrides.validityDays !== undefined || overrides.expiresAt !== undefined;
  return {
    id: overrides.id ?? "user_1",
    email: "learner@example.com",
    name: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    isAdmin: false,
    isBlocked: false,
    translationQuota: null,
    exampleGenerationQuota: null,
    correctionUsage: null,
    quotaOverride: null,
    redeemedAccessCodes: hasRedemption
      ? [
          {
            redeemedAt: overrides.redeemedAt ?? null,
            validityDays: overrides.validityDays ?? null,
            expiresAt: overrides.expiresAt ?? null,
          },
        ]
      : [],
  };
}

describe("admin user list helpers", () => {
  beforeEach(() => {
    countMock.mockReset();
    findManyMock.mockReset();
    countMock.mockResolvedValue(0);
    findManyMock.mockResolvedValue([]);
  });

  it("normalizes a search, status, and rejects invalid page values", () => {
    expect(parseAdminUserListQuery({ query: "  learner@example.com  ", status: "blocked", page: "3" })).toEqual({
      query: "learner@example.com",
      status: "blocked",
      page: 3,
    });
    expect(parseAdminUserListQuery({ query: undefined, status: "not-a-status", page: "-7" })).toEqual({
      query: "",
      status: "all",
      page: 1,
    });
  });

  it("resolves a duplicated query-string param to its first value, matching URLSearchParams#get", () => {
    expect(parseAdminUserListQuery({ query: ["a", "b"], status: ["blocked", "admin"], page: ["2", "9"] })).toEqual({
      query: "a",
      status: "blocked",
      page: 2,
    });
  });

  it("filters to blocked or admin accounts without referencing access codes", async () => {
    await getAdminUsersPage({ query: "", status: "blocked", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({ where: { isBlocked: true } });

    await getAdminUsersPage({ query: "", status: "admin", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({ where: { isAdmin: true } });
  });

  it("classifies activated/unactivated by currently live admission, not merely having ever redeemed, via a single bounded relation filter rather than a separate id-materializing query", async () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    const isLive = { OR: [{ expiresAt: null, validityDays: null }, { expiresAt: { gt: now } }] };

    await getAdminUsersPage({ query: "", status: "activated", page: 1 }, now);
    // One single count() call -- no separate query materializes an id list
    // first, so there is no window between two queries for a redemption,
    // reset, or expiry to land in and be missed.
    expect(countMock).toHaveBeenCalledTimes(1);
    expect(countMock).toHaveBeenLastCalledWith({
      where: { redeemedAccessCodes: { some: isLive } },
    });

    await getAdminUsersPage({ query: "", status: "unactivated", page: 1 }, now);
    expect(countMock).toHaveBeenLastCalledWith({
      where: { isAdmin: false, redeemedAccessCodes: { none: isLive } },
    });
  });

  it("wires the status filter through the same accessCodeIsLiveWhere predicate access-code-expiry.ts defines, not a hand-rolled duplicate", async () => {
    // Keeping this one source of truth (rather than reimplementing the
    // predicate here too) is what makes the mixed-version-rollout safety
    // guarantee (requiring validityDays null alongside expiresAt null
    // before trusting "lifetime" -- see access-code-expiry.test.ts) apply
    // here automatically instead of needing to be re-verified per caller.
    const now = new Date("2026-08-10T12:00:00.000Z");

    await getAdminUsersPage({ query: "", status: "activated", page: 1 }, now);
    expect(countMock).toHaveBeenLastCalledWith({
      where: { redeemedAccessCodes: { some: accessCodeIsLiveWhere(now) } },
    });
  });

  it("does not exclude the activation-exempt owner as blocked or admin filters", async () => {
    await getAdminUsersPage({ query: "", status: "all", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({ where: {} });
  });

  it("combines a search query with a status filter", async () => {
    await getAdminUsersPage({ query: "learner@example.com", status: "blocked", page: 1 });

    expect(countMock).toHaveBeenLastCalledWith({
      where: {
        OR: [
          { email: { contains: "learner@example.com", mode: "insensitive" } },
          { name: { contains: "learner@example.com", mode: "insensitive" } },
        ],
        isBlocked: true,
      },
    });
  });

  it("does not show a previous minute, day, or month as current usage", () => {
    const now = new Date("2026-08-10T12:34:45.000Z");
    const usage = getCurrentAdminUsage(
      {
        translationQuota: {
          minuteStartedAt: new Date("2026-08-10T12:33:00.000Z"),
          minuteRequestCount: 8,
          minuteCharacterCount: 900,
          monthStartedAt: new Date("2026-07-01T00:00:00.000Z"),
          monthCharacterCount: 8_000,
        },
        exampleGenerationQuota: {
          dayStartedAt: new Date("2026-08-09T00:00:00.000Z"),
          dailyRequestCount: 4,
        },
        correctionUsage: {
          dayStartedAt: new Date("2026-08-09T00:00:00.000Z"),
          dailyRequestCount: 3,
          monthStartedAt: new Date("2026-07-01T00:00:00.000Z"),
          monthlyRequestCount: 21,
        },
      },
      now,
    );

    expect(usage).toEqual({
      translation: {
        currentMinuteRequests: 0,
        currentMinuteCharacters: 0,
        currentMonthCharacters: 0,
      },
      examples: { currentDayRequests: 0 },
      corrections: { currentDayRequests: 0, currentMonthRequests: 0 },
    });
  });

  it("reports every counter that belongs to its active UTC window", () => {
    const now = new Date("2026-08-10T12:34:45.000Z");
    const usage = getCurrentAdminUsage(
      {
        translationQuota: {
          minuteStartedAt: new Date("2026-08-10T12:34:00.000Z"),
          minuteRequestCount: 2,
          minuteCharacterCount: 256,
          monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
          monthCharacterCount: 6_400,
        },
        exampleGenerationQuota: {
          dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
          dailyRequestCount: 5,
        },
        correctionUsage: {
          dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
          dailyRequestCount: 2,
          monthStartedAt: new Date("2026-08-01T00:00:00.000Z"),
          monthlyRequestCount: 11,
        },
      },
      now,
    );

    expect(usage).toEqual({
      translation: {
        currentMinuteRequests: 2,
        currentMinuteCharacters: 256,
        currentMonthCharacters: 6_400,
      },
      examples: { currentDayRequests: 5 },
      corrections: { currentDayRequests: 2, currentMonthRequests: 11 },
    });
  });

  it("keeps null overrides distinct from an intentional zero", () => {
    expect(serializeQuotaOverride(null)).toEqual({
      translationRequestsPerMinute: null,
      translationCharactersPerMinute: null,
      translationCharactersPerMonth: null,
      exampleGenerationsPerDay: null,
      correctionRequestsPerDay: null,
    });
    expect(
      serializeQuotaOverride({
        translationRequestsPerMinute: 0,
        translationCharactersPerMinute: null,
        translationCharactersPerMonth: null,
        exampleGenerationsPerDay: null,
        correctionRequestsPerDay: null,
      }),
    ).toMatchObject({ translationRequestsPerMinute: 0 });
  });

  it("keeps activatedAt (historical) distinct from hasLiveAdmission (current) for an expired timed code", async () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    findManyMock.mockResolvedValue([
      userRecord({ id: "user_never", redeemedAt: undefined }),
      userRecord({ id: "user_lifetime", redeemedAt: new Date("2026-01-01T00:00:00.000Z"), expiresAt: null }),
      userRecord({
        id: "user_live_timed",
        redeemedAt: new Date("2026-08-09T00:00:00.000Z"),
        expiresAt: new Date("2026-08-16T00:00:00.000Z"),
      }),
      userRecord({
        id: "user_expired_timed",
        redeemedAt: new Date("2026-07-01T00:00:00.000Z"),
        expiresAt: new Date("2026-07-08T00:00:00.000Z"),
      }),
    ]);

    const page = await getAdminUsersPage({ query: "", status: "all", page: 1 }, now);
    const byId = Object.fromEntries(page.users.map((user) => [user.id, user]));

    expect(byId.user_never).toMatchObject({ activatedAt: null, hasLiveAdmission: false });
    expect(byId.user_lifetime).toMatchObject({
      activatedAt: "2026-01-01T00:00:00.000Z",
      hasLiveAdmission: true,
    });
    expect(byId.user_live_timed).toMatchObject({
      activatedAt: "2026-08-09T00:00:00.000Z",
      hasLiveAdmission: true,
    });
    // The historical redemption date is preserved even though the code's
    // window has since elapsed -- only hasLiveAdmission reflects that it no
    // longer grants access. A UI that used activatedAt truthiness alone (as
    // the users table badge once did) would wrongly call this "Activated".
    expect(byId.user_expired_timed).toMatchObject({
      activatedAt: "2026-07-01T00:00:00.000Z",
      hasLiveAdmission: false,
    });
  });

  it("falls back to deriving hasLiveAdmission for a mixed-version-rollout row (validityDays set, expiresAt never persisted)", async () => {
    // Complements the userStatusWhere test above: the WHERE clause itself
    // cannot use this fallback (Prisma can't express the date arithmetic),
    // but the per-row display can and does, via resolveExpiresAt -- so a
    // gap row that a search/status filter didn't exclude still renders
    // with the correct badge instead of a wrong "Activated".
    const now = new Date("2026-08-10T12:00:00.000Z");
    findManyMock.mockResolvedValue([
      userRecord({
        id: "user_gap_expired",
        redeemedAt: new Date("2026-08-01T00:00:00.000Z"),
        validityDays: 3,
        expiresAt: null,
      }),
      userRecord({
        id: "user_gap_live",
        redeemedAt: new Date("2026-08-09T00:00:00.000Z"),
        validityDays: 7,
        expiresAt: null,
      }),
    ]);

    const page = await getAdminUsersPage({ query: "", status: "all", page: 1 }, now);
    const byId = Object.fromEntries(page.users.map((user) => [user.id, user]));

    expect(byId.user_gap_expired).toMatchObject({ hasLiveAdmission: false });
    expect(byId.user_gap_live).toMatchObject({ hasLiveAdmission: true });
  });
});

describe("getAdminUsersForExport", () => {
  beforeEach(() => {
    countMock.mockReset();
    findManyMock.mockReset();
    findManyMock.mockResolvedValue([]);
  });

  it("requests one row past the cap in a single query, not a separate count, to avoid a TOCTOU gap between counting and fetching", async () => {
    await getAdminUsersForExport({ query: "", status: "all" });

    expect(countMock).not.toHaveBeenCalled();
    expect(findManyMock).toHaveBeenCalledWith(expect.objectContaining({ take: MAX_USERS_EXPORT_ROWS + 1 }));
  });

  it("refuses instead of silently truncating when the sentinel row past the cap comes back", async () => {
    findManyMock.mockResolvedValue(
      Array.from({ length: MAX_USERS_EXPORT_ROWS + 1 }, (_, index) => userRecord({ id: `user_${index}` })),
    );

    const result = await getAdminUsersForExport({ query: "", status: "all" });

    expect(result).toEqual({ truncated: true });
  });

  it("returns every row when the result is within the cap", async () => {
    findManyMock.mockResolvedValue([userRecord({ id: "user_1" })]);

    const result = await getAdminUsersForExport({ query: "", status: "all" });

    expect(result.truncated).toBe(false);
    if (!result.truncated) {
      expect(result.users).toHaveLength(1);
    }
  });
});
