import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ACCESS_CODE_TRANSACTION_TIMEOUT_MS = 3_000;

export type AccessCodeRedemption =
  | { kind: "redeemed"; showWelcome: boolean }
  | { kind: "alreadyActivated" }
  | { kind: "invalid" };

export type AccessCodeActivationReset =
  | { kind: "reset" }
  | { kind: "notActivated" };

/**
 * Access codes are generated in upper case. Normalizing the learner's entry
 * keeps a pasted lowercase code from being needlessly rejected, while leaving
 * separators intact so the generator can choose a readable format.
 */
export function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase();
}

/** Returns whether the learner has consumed an access code and may use the app. */
export async function hasRedeemedAccessCode(userId: string): Promise<boolean> {
  const redemption = await prisma.accessCode.findUnique({
    where: { redeemedByUserId: userId },
    select: { id: true },
  });

  return redemption !== null;
}

function redemptionLockKey(userId: string) {
  return `access-code-redemption:${userId}`;
}

function isUniqueConstraint(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Atomically consumes an unused code for one learner. The per-learner lock
 * prevents two simultaneous submissions with different codes from consuming
 * both; the conditional update independently protects the code from being
 * redeemed by two different learners. The welcome marker is written in the
 * same transaction, so only the first successful admission gets the welcome
 * handoff even if access is later reset and restored.
 */
export async function redeemAccessCode(userId: string, code: string): Promise<AccessCodeRedemption> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${redemptionLockKey(userId)})::bigint)`;

        const existingRedemption = await tx.accessCode.findUnique({
          where: { redeemedByUserId: userId },
          select: { id: true },
        });
        if (existingRedemption) return { kind: "alreadyActivated" };

        const claimed = await tx.accessCode.updateMany({
          where: {
            code,
            redeemedByUserId: null,
            // The relation intentionally keeps this timestamp even if its
            // redeemer record is ever removed. It is the durable single-use
            // marker, not merely an audit convenience.
            redeemedAt: null,
          },
          data: {
            redeemedByUserId: userId,
            redeemedAt: new Date(),
          },
        });

        if (claimed.count !== 1) return { kind: "invalid" };

        const welcomeMarker = await tx.user.updateMany({
          where: { id: userId, activationWelcomeShownAt: null },
          data: { activationWelcomeShownAt: new Date() },
        });

        return { kind: "redeemed", showWelcome: welcomeMarker.count === 1 };
      },
      { timeout: ACCESS_CODE_TRANSACTION_TIMEOUT_MS },
    );
  } catch (error) {
    // The unique `redeemedByUserId` index is a durable backstop for any
    // external writer that did not take our advisory lock. Treat its race as
    // the idempotent outcome rather than consuming or exposing another code.
    if (isUniqueConstraint(error) && (await hasRedeemedAccessCode(userId))) {
      return { kind: "alreadyActivated" };
    }
    throw error;
  }
}

/**
 * Removes a learner's current access-code admission without making the code
 * reusable. This shares redemption's per-learner advisory lock so a reset and
 * a newly issued-code redemption cannot race past one another. `redeemedAt`
 * is deliberately immutable: it is the durable single-use marker.
 */
export async function resetAccessCodeActivation(userId: string): Promise<AccessCodeActivationReset> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${redemptionLockKey(userId)})::bigint)`;

      const activeAdmission = await tx.accessCode.findUnique({
        where: { redeemedByUserId: userId },
        select: { id: true },
      });
      if (!activeAdmission) return { kind: "notActivated" };

      const detached = await tx.accessCode.updateMany({
        where: {
          id: activeAdmission.id,
          redeemedByUserId: userId,
          // Never clear this permanent spent marker. A later new code may
          // admit the learner, but this original code can never be reused.
          redeemedAt: { not: null },
        },
        data: { redeemedByUserId: null },
      });

      if (detached.count !== 1) return { kind: "notActivated" };

      // Accounts activated before the welcome marker existed have no value
      // here. Mark the selected, pre-existing admission while detaching it so
      // a restored learner never sees a supposedly one-time welcome again.
      await tx.user.updateMany({
        where: { id: userId, activationWelcomeShownAt: null },
        data: { activationWelcomeShownAt: new Date() },
      });

      return { kind: "reset" };
    },
    { timeout: ACCESS_CODE_TRANSACTION_TIMEOUT_MS },
  );
}
