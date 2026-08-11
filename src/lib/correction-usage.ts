import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveUserQuotaLimits } from "@/lib/user-quota-limits";

const QUOTA_TRANSACTION_TIMEOUT_MS = 3_000;

export type CorrectionUsageReservation =
  | { kind: "claimed"; dayStartedAt: Date; monthStartedAt: Date }
  | { kind: "dailyLimit"; resetAt: Date; usageValue: number; quotaLimit: number };

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfNextUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Reserves one fresh correction before its model request begins. The per-user
 * advisory lock makes the read/limit/write sequence safe across server
 * instances and evaluates an admin override atomically with the reservation.
 */
export async function reserveCorrectionUsage(userId: string): Promise<CorrectionUsageReservation> {
  return prisma.$transaction(
    async (tx) => {
      // All three quota reservation paths share this per-user key. That lets
      // an override write serialize with whichever provider path is currently
      // checking its effective limit, without holding a provider call open.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;

      const now = new Date();
      const dayStartedAt = startOfUtcDay(now);
      const monthStartedAt = startOfUtcMonth(now);
      const [existing, overrides] = await Promise.all([
        tx.correctionUsage.findUnique({ where: { userId } }),
        tx.userQuotaOverride.findUnique({
          where: { userId },
          select: { correctionRequestsPerDay: true },
        }),
      ]);
      const continuingDay = existing?.dayStartedAt.getTime() === dayStartedAt.getTime();
      const continuingMonth = existing?.monthStartedAt.getTime() === monthStartedAt.getTime();
      const dailyRequestCount = (continuingDay ? existing.dailyRequestCount : 0) + 1;
      const monthlyRequestCount = (continuingMonth ? existing.monthlyRequestCount : 0) + 1;
      const { correctionRequestsPerDay } = resolveUserQuotaLimits(overrides);

      if (dailyRequestCount > correctionRequestsPerDay) {
        return {
          kind: "dailyLimit",
          resetAt: startOfNextUtcDay(now),
          usageValue: dailyRequestCount,
          quotaLimit: correctionRequestsPerDay,
        };
      }

      await tx.correctionUsage.upsert({
        where: { userId },
        create: { userId, dayStartedAt, dailyRequestCount, monthStartedAt, monthlyRequestCount },
        update: { dayStartedAt, dailyRequestCount, monthStartedAt, monthlyRequestCount },
      });

      return { kind: "claimed", dayStartedAt, monthStartedAt };
    },
    { timeout: QUOTA_TRANSACTION_TIMEOUT_MS },
  );
}
