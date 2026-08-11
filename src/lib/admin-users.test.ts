import { beforeEach, describe, expect, it, vi } from "vitest";

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
  getCurrentAdminUsage,
  parseAdminUserListQuery,
  serializeQuotaOverride,
} = await import("./admin-users");

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
    expect(parseAdminUserListQuery({ query: ["not", "valid"], status: "not-a-status", page: "-7" })).toEqual({
      query: "",
      status: "all",
      page: 1,
    });
  });

  it("filters to blocked, admin, activated, or unactivated accounts", async () => {
    await getAdminUsersPage({ query: "", status: "blocked", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({ where: { isBlocked: true } });

    await getAdminUsersPage({ query: "", status: "admin", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({ where: { isAdmin: true } });

    await getAdminUsersPage({ query: "", status: "activated", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({
      where: { redeemedAccessCodes: { some: { redeemedAt: { not: null } } } },
    });

    await getAdminUsersPage({ query: "", status: "unactivated", page: 1 });
    expect(countMock).toHaveBeenLastCalledWith({
      where: { isAdmin: false, redeemedAccessCodes: { none: { redeemedAt: { not: null } } } },
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
