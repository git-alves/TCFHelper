import { beforeEach, describe, expect, it, vi } from "vitest";

const { countMock, findManyMock, accessCodeFindManyMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  findManyMock: vi.fn(),
  accessCodeFindManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: countMock,
      findMany: findManyMock,
      findUnique: vi.fn(),
    },
    accessCode: {
      findMany: accessCodeFindManyMock,
    },
  },
}));

const {
  getAdminUsersPage,
  getCurrentAdminUsage,
  parseAdminUserListQuery,
  serializeQuotaOverride,
} = await import("./admin-users");

describe("admin user list helpers", () => {
  beforeEach(() => {
    countMock.mockReset();
    findManyMock.mockReset();
    accessCodeFindManyMock.mockReset();
    countMock.mockResolvedValue(0);
    findManyMock.mockResolvedValue([]);
    accessCodeFindManyMock.mockResolvedValue([]);
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

  it("filters to blocked or admin accounts without consulting access codes", async () => {
    await getAdminUsersPage({ query: "", status: "blocked", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({ where: { isBlocked: true } });
    expect(accessCodeFindManyMock).not.toHaveBeenCalled();

    await getAdminUsersPage({ query: "", status: "admin", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({ where: { isAdmin: true } });
    expect(accessCodeFindManyMock).not.toHaveBeenCalled();
  });

  it("classifies activated/unactivated by currently live admission, not merely having ever redeemed", async () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    accessCodeFindManyMock.mockResolvedValue([
      // Lifetime code: always live once redeemed.
      { redeemedByUserId: "user_lifetime", redeemedAt: new Date("2026-01-01T00:00:00.000Z"), validityDays: null },
      // Timed code still inside its window.
      { redeemedByUserId: "user_active_timed", redeemedAt: new Date("2026-08-09T00:00:00.000Z"), validityDays: 7 },
      // Timed code past its derived expiry, but not yet lazily detached --
      // must NOT count as a live admission even though redeemedAt is set.
      { redeemedByUserId: "user_expired_timed", redeemedAt: new Date("2026-07-01T00:00:00.000Z"), validityDays: 7 },
    ]);

    await getAdminUsersPage({ query: "", status: "activated", page: 1 }, now);
    expect(accessCodeFindManyMock).toHaveBeenLastCalledWith({
      where: { redeemedByUserId: { not: null } },
      select: { redeemedByUserId: true, redeemedAt: true, validityDays: true },
    });
    expect(countMock).toHaveBeenLastCalledWith({
      where: { id: { in: ["user_lifetime", "user_active_timed"] } },
    });

    await getAdminUsersPage({ query: "", status: "unactivated", page: 1 }, now);
    expect(countMock).toHaveBeenLastCalledWith({
      where: { isAdmin: false, id: { notIn: ["user_lifetime", "user_active_timed"] } },
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
});
