import "server-only";

import { prisma } from "@/lib/prisma";

export type AdminOverviewStats = {
  users: {
    total: number;
    blocked: number;
    admins: number;
    activated: number;
  };
  accessCodes: {
    total: number;
    redeemed: number;
    unredeemed: number;
  };
  usage: {
    translation: { charactersThisMonth: number; activeUsersThisMonth: number };
    examples: { requestsToday: number; activeUsersToday: number };
    corrections: { requestsToday: number; requestsThisMonth: number; activeUsersToday: number };
  };
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Aggregates only the currently-active rolling window for each quota table
 * (matching the same day/month boundary each reservation transaction writes),
 * so a stale row from a prior window is not double-counted as live usage.
 */
export async function getAdminOverviewStats(now = new Date()): Promise<AdminOverviewStats> {
  const currentDayStart = startOfUtcDay(now);
  const currentMonthStart = startOfUtcMonth(now);

  const [
    totalUsers,
    blockedUsers,
    adminUsers,
    activatedUsers,
    totalAccessCodes,
    redeemedAccessCodes,
    translationMonthAgg,
    exampleDayAgg,
    correctionDayAgg,
    correctionMonthAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.user.count({ where: { redeemedAccessCodes: { some: { redeemedAt: { not: null } } } } }),
    prisma.accessCode.count(),
    prisma.accessCode.count({ where: { redeemedAt: { not: null } } }),
    prisma.translationQuota.aggregate({
      where: { monthStartedAt: currentMonthStart },
      _sum: { monthCharacterCount: true },
      _count: { _all: true },
    }),
    prisma.exampleGenerationQuota.aggregate({
      where: { dayStartedAt: currentDayStart },
      _sum: { dailyRequestCount: true },
      _count: { _all: true },
    }),
    prisma.correctionUsage.aggregate({
      where: { dayStartedAt: currentDayStart },
      _sum: { dailyRequestCount: true },
      _count: { _all: true },
    }),
    prisma.correctionUsage.aggregate({
      where: { monthStartedAt: currentMonthStart },
      _sum: { monthlyRequestCount: true },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      blocked: blockedUsers,
      admins: adminUsers,
      activated: activatedUsers,
    },
    accessCodes: {
      total: totalAccessCodes,
      redeemed: redeemedAccessCodes,
      unredeemed: totalAccessCodes - redeemedAccessCodes,
    },
    usage: {
      translation: {
        charactersThisMonth: translationMonthAgg._sum.monthCharacterCount ?? 0,
        activeUsersThisMonth: translationMonthAgg._count._all,
      },
      examples: {
        requestsToday: exampleDayAgg._sum.dailyRequestCount ?? 0,
        activeUsersToday: exampleDayAgg._count._all,
      },
      corrections: {
        requestsToday: correctionDayAgg._sum.dailyRequestCount ?? 0,
        requestsThisMonth: correctionMonthAgg._sum.monthlyRequestCount ?? 0,
        activeUsersToday: correctionDayAgg._count._all,
      },
    },
  };
}
