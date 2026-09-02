import "server-only";

import { prisma } from "@/lib/prisma";
import { accessCodeIsLiveWhere } from "@/lib/access-code-expiry";
import { ONLINE_THRESHOLD_MS } from "@/lib/presence-limits";

export type AdminOverviewStats = {
  users: {
    total: number;
    blocked: number;
    activated: number;
    onlineNow: number;
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

export interface GeminiRequestsToday {
  correctionRequestsToday: number;
  exampleRequestsToday: number;
}

/**
 * Shared by the overview stats below and the admin settings API's
 * per-key consumption bar (src/lib/app-config.ts), so both read the exact
 * same reservation-time counters instead of drifting on what "today's
 * Gemini requests" means.
 */
export async function getGeminiRequestsToday(now = new Date()): Promise<GeminiRequestsToday> {
  const currentDayStart = startOfUtcDay(now);

  const [exampleDayAgg, correctionDayAgg] = await Promise.all([
    prisma.exampleGenerationQuota.aggregate({
      // Failed provider calls refund dailyRequestCount but leave a cooldown
      // row behind. Do not report zero-work rows as active learners.
      where: { dayStartedAt: currentDayStart, dailyRequestCount: { gt: 0 } },
      _sum: { dailyRequestCount: true },
      _count: { _all: true },
    }),
    prisma.correctionUsage.aggregate({
      where: { dayStartedAt: currentDayStart },
      _sum: { dailyRequestCount: true },
      _count: { _all: true },
    }),
  ]);

  return {
    correctionRequestsToday: correctionDayAgg._sum.dailyRequestCount ?? 0,
    exampleRequestsToday: exampleDayAgg._sum.dailyRequestCount ?? 0,
  };
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
    activatedUsers,
    onlineNowUsers,
    totalAccessCodes,
    redeemedAccessCodes,
    translationMonthAgg,
    exampleDayAgg,
    correctionDayAgg,
    correctionMonthAgg,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBlocked: true } }),
    // Matches the users list's own Activated filter: a currently live
    // admission, not merely having redeemed a code at some point. A timed
    // code past its expiry stays attached until the learner's own next
    // request lazily detaches it, so a plain "redeemedAt is not null"
    // count would keep counting them here after the users list itself
    // already calls them unactivated / "Access expired".
    prisma.user.count({ where: { redeemedAccessCodes: { some: accessCodeIsLiveWhere(now) } } }),
    // isBlocked: false is redundant in practice (touchLastActive stops
    // updating the moment an account is blocked, so its timestamp ages out
    // within the threshold on its own) but makes the count exactly correct
    // even in that narrow blocked-while-still-recently-active window.
    prisma.user.count({
      where: { isBlocked: false, lastActiveAt: { gte: new Date(now.getTime() - ONLINE_THRESHOLD_MS) } },
    }),
    prisma.accessCode.count(),
    prisma.accessCode.count({ where: { redeemedAt: { not: null } } }),
    prisma.translationQuota.aggregate({
      where: { monthStartedAt: currentMonthStart },
      _sum: { monthCharacterCount: true },
      _count: { _all: true },
    }),
    prisma.exampleGenerationQuota.aggregate({
      // Failed provider calls refund dailyRequestCount but leave a cooldown
      // row behind. Do not report zero-work rows as active learners.
      where: { dayStartedAt: currentDayStart, dailyRequestCount: { gt: 0 } },
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
      activated: activatedUsers,
      onlineNow: onlineNowUsers,
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
