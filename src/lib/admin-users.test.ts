import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

const {
  getCurrentAdminUsage,
  parseAdminUserListQuery,
  serializeQuotaOverride,
} = await import("./admin-users");

describe("admin user list helpers", () => {
  it("normalizes a search and rejects invalid page values", () => {
    expect(parseAdminUserListQuery({ query: "  learner@example.com  ", page: "3" })).toEqual({
      query: "learner@example.com",
      page: 3,
    });
    expect(parseAdminUserListQuery({ query: ["not", "valid"], page: "-7" })).toEqual({
      query: "",
      page: 1,
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
