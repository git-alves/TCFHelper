import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveUserQuotaLimits } from "@/lib/user-quota-limits";

const QUOTA_TRANSACTION_TIMEOUT_MS = 3_000;

// A refunded failure never raises dailyRequestCount, so that count alone no
// longer bounds how often a persistently failing provider gets called, and a
// failed call can still cost tokens (a truncated answer, for instance).
// dailyAttemptCount is never refunded and is capped separately, the way example
// generation caps its attempts. Sized at twice the learner's daily limit: a
// learner may spend as many attempts on provider failures as on corrections they
// receive (the default of 10 corrections a day allows 20 attempts), so a long
// outage does not lock them out after a few tries, while the worst case stays at
// twice what the limit alone would allow. The ceiling stops an unusually high
// per-learner override from allowing unlimited paid retries; a limit of 0 (the
// administrator suspending corrections) leaves no attempts at all.
export const CORRECTION_ATTEMPT_MULTIPLIER = 2;
export const CORRECTION_ATTEMPT_CEILING = 1_000;

export function correctionAttemptLimit(dailyLimit: number) {
  return Math.min(CORRECTION_ATTEMPT_CEILING, dailyLimit * CORRECTION_ATTEMPT_MULTIPLIER);
}

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

      // Checked independently of the refundable count above: a string of
      // refunded failures must not let attempts through forever.
      const dailyAttemptCount = (continuingDay ? existing.dailyAttemptCount : 0) + 1;
      const dailyAttemptLimit = correctionAttemptLimit(correctionRequestsPerDay);
      if (dailyAttemptCount > dailyAttemptLimit) {
        return {
          kind: "dailyLimit",
          resetAt: startOfNextUtcDay(now),
          usageValue: dailyAttemptCount,
          quotaLimit: dailyAttemptLimit,
        };
      }

      // The failed counts belong to their window like the request counts do.
      const dailyFailedCount = continuingDay ? existing.dailyFailedCount : 0;
      const monthlyFailedCount = continuingMonth ? existing.monthlyFailedCount : 0;

      await tx.correctionUsage.upsert({
        where: { userId },
        create: {
          userId,
          dayStartedAt,
          dailyRequestCount,
          dailyAttemptCount,
          dailyFailedCount,
          monthStartedAt,
          monthlyRequestCount,
          monthlyFailedCount,
        },
        update: {
          dayStartedAt,
          dailyRequestCount,
          dailyAttemptCount,
          dailyFailedCount,
          monthStartedAt,
          monthlyRequestCount,
          monthlyFailedCount,
        },
      });

      return { kind: "claimed", dayStartedAt, monthStartedAt };
    },
    { timeout: QUOTA_TRANSACTION_TIMEOUT_MS },
  );
}

/**
 * Gives back a reservation whose correction failed because of the AI provider,
 * and records the failure. The daily and monthly request counts go down by one
 * (never below zero) and the failed counts go up by one, each only while the
 * stored window is still the one the reservation was made in: a failure that
 * finishes after UTC midnight (or month end) must never decrement the new
 * window's count. The attempt count is deliberately left alone (see
 * correctionAttemptLimit).
 *
 * Takes the same per-user advisory lock as reserveCorrectionUsage, because the
 * reservation writes absolute values it read earlier in its own transaction:
 * an unsynchronized decrement could be silently overwritten by it.
 */
export async function refundCorrectionUsage(
  userId: string,
  reservation: { dayStartedAt: Date; monthStartedAt: Date },
): Promise<{ refundedDay: boolean; refundedMonth: boolean }> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;

      const existing = await tx.correctionUsage.findUnique({ where: { userId } });
      if (!existing) return { refundedDay: false, refundedMonth: false };

      const sameDay = existing.dayStartedAt.getTime() === reservation.dayStartedAt.getTime();
      const sameMonth = existing.monthStartedAt.getTime() === reservation.monthStartedAt.getTime();
      if (!sameDay && !sameMonth) return { refundedDay: false, refundedMonth: false };

      await tx.correctionUsage.update({
        where: { userId },
        data: {
          ...(sameDay
            ? {
                dailyRequestCount: Math.max(0, existing.dailyRequestCount - 1),
                dailyFailedCount: existing.dailyFailedCount + 1,
              }
            : {}),
          ...(sameMonth
            ? {
                monthlyRequestCount: Math.max(0, existing.monthlyRequestCount - 1),
                monthlyFailedCount: existing.monthlyFailedCount + 1,
              }
            : {}),
        },
      });
      return { refundedDay: sameDay, refundedMonth: sameMonth };
    },
    { timeout: QUOTA_TRANSACTION_TIMEOUT_MS },
  );
}
