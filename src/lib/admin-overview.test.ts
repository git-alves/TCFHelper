import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  userCountMock,
  accessCodeCountMock,
  translationAggregateMock,
  exampleAggregateMock,
  correctionAggregateMock,
} = vi.hoisted(() => ({
  userCountMock: vi.fn(),
  accessCodeCountMock: vi.fn(),
  translationAggregateMock: vi.fn(),
  exampleAggregateMock: vi.fn(),
  correctionAggregateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: userCountMock },
    accessCode: { count: accessCodeCountMock },
    translationQuota: { aggregate: translationAggregateMock },
    exampleGenerationQuota: { aggregate: exampleAggregateMock },
    correctionUsage: { aggregate: correctionAggregateMock },
  },
}));

const { getAdminOverviewStats } = await import("./admin-overview");

const NOW = new Date("2026-08-10T12:00:00.000Z");

beforeEach(() => {
  userCountMock.mockReset();
  accessCodeCountMock.mockReset();
  translationAggregateMock.mockReset();
  exampleAggregateMock.mockReset();
  correctionAggregateMock.mockReset();

  userCountMock.mockImplementation(
    async (args?: {
      where?: { isBlocked?: boolean; isAdmin?: boolean; redeemedAccessCodes?: unknown; lastActiveAt?: unknown };
    }) => {
      if (args?.where?.lastActiveAt) return 4;
      if (args?.where?.isBlocked) return 2;
      if (args?.where?.isAdmin) return 1;
      if (args?.where?.redeemedAccessCodes) return 30;
      return 50;
    },
  );
  accessCodeCountMock.mockImplementation(async (args?: { where?: { redeemedAt?: unknown } }) => {
    if (args?.where?.redeemedAt) return 30;
    return 40;
  });
  translationAggregateMock.mockResolvedValue({ _sum: { monthCharacterCount: 12_345 }, _count: { _all: 8 } });
  exampleAggregateMock.mockResolvedValue({ _sum: { dailyRequestCount: 20 }, _count: { _all: 5 } });
  correctionAggregateMock.mockResolvedValueOnce({ _sum: { dailyRequestCount: 7 }, _count: { _all: 3 } });
  correctionAggregateMock.mockResolvedValueOnce({ _sum: { monthlyRequestCount: 99 } });
});

describe("getAdminOverviewStats", () => {
  it("aggregates registered users, access codes, and current-window usage", async () => {
    const stats = await getAdminOverviewStats(NOW);

    expect(stats.users).toEqual({ total: 50, blocked: 2, admins: 1, activated: 30, onlineNow: 4 });
    expect(stats.accessCodes).toEqual({ total: 40, redeemed: 30, unredeemed: 10 });
    expect(stats.usage.translation).toEqual({ charactersThisMonth: 12_345, activeUsersThisMonth: 8 });
    expect(stats.usage.examples).toEqual({ requestsToday: 20, activeUsersToday: 5 });
    expect(stats.usage.corrections).toEqual({
      requestsToday: 7,
      requestsThisMonth: 99,
      activeUsersToday: 3,
    });
  });

  it("filters each aggregate to the current UTC day/month boundary", async () => {
    await getAdminOverviewStats(NOW);

    expect(translationAggregateMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { monthStartedAt: new Date("2026-08-01T00:00:00.000Z") } }),
    );
    expect(exampleAggregateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dayStartedAt: new Date("2026-08-10T00:00:00.000Z"),
          dailyRequestCount: { gt: 0 },
        },
      }),
    );
  });

  it("counts online users as active, unblocked accounts within the heartbeat threshold", async () => {
    await getAdminOverviewStats(NOW);

    expect(userCountMock).toHaveBeenCalledWith({
      where: { isBlocked: false, lastActiveAt: { gte: new Date("2026-08-10T11:58:00.000Z") } },
    });
  });

  it("treats redeemedAt as the durable single-use marker", async () => {
    await getAdminOverviewStats(NOW);

    expect(accessCodeCountMock).toHaveBeenCalledWith({ where: { redeemedAt: { not: null } } });
    expect(userCountMock).toHaveBeenCalledWith({
      where: { redeemedAccessCodes: { some: { redeemedAt: { not: null } } } },
    });
  });

  it("treats missing sums as zero", async () => {
    translationAggregateMock.mockResolvedValue({ _sum: { monthCharacterCount: null }, _count: { _all: 0 } });
    exampleAggregateMock.mockResolvedValue({ _sum: { dailyRequestCount: null }, _count: { _all: 0 } });
    correctionAggregateMock.mockReset();
    correctionAggregateMock.mockResolvedValueOnce({ _sum: { dailyRequestCount: null }, _count: { _all: 0 } });
    correctionAggregateMock.mockResolvedValueOnce({ _sum: { monthlyRequestCount: null } });

    const stats = await getAdminOverviewStats(NOW);

    expect(stats.usage.translation.charactersThisMonth).toBe(0);
    expect(stats.usage.examples.requestsToday).toBe(0);
    expect(stats.usage.corrections.requestsToday).toBe(0);
    expect(stats.usage.corrections.requestsThisMonth).toBe(0);
  });
});
