import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ACCESS_CODE_TRANSACTION_TIMEOUT_MS = 3_000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AccessCodeRedemption =
  | { kind: "redeemed"; showWelcome: boolean; accessCodeId: string }
  | { kind: "alreadyActivated" }
  | { kind: "invalid" };

export type AccessCodeActivationReset =
  | { kind: "reset" }
  | { kind: "notActivated" };

type AdmissionLockedTx = {
  accessCode: Pick<Prisma.TransactionClient["accessCode"], "findUnique" | "updateMany">;
  user: Pick<Prisma.TransactionClient["user"], "updateMany">;
};

type AdmissionResolution =
  | { kind: "none" }
  | { kind: "active" }
  | { kind: "expired" };

/**
 * Access codes are generated in upper case. Normalizing the learner's entry
 * keeps a pasted lowercase code from being needlessly rejected, while leaving
 * separators intact so the generator can choose a readable format.
 */
export function normalizeAccessCode(code: string) {
  return code.trim().toUpperCase();
}

function redemptionLockKey(userId: string) {
  return `access-code-redemption:${userId}`;
}

/**
 * Must run from inside a transaction that already holds this learner's
 * per-user advisory lock. Re-reads whichever admission is current (never a
 * value read before the lock was taken) and, if a timed code's window has
 * elapsed, detaches that exact row by id. This is what makes expiry safe
 * against a redeem/reset racing in between an earlier unlocked read and this
 * check: a concurrent redemption's new code is never mistaken for the one
 * that was actually found expired.
 */
async function resolveAdmissionLocked(tx: AdmissionLockedTx, userId: string): Promise<AdmissionResolution> {
  const admission = await tx.accessCode.findUnique({
    where: { redeemedByUserId: userId },
    select: { id: true, redeemedAt: true, validityDays: true },
  });
  if (!admission) return { kind: "none" };
  if (admission.validityDays === null || admission.redeemedAt === null) return { kind: "active" };

  const expiresAt = admission.redeemedAt.getTime() + admission.validityDays * MS_PER_DAY;
  if (Date.now() < expiresAt) return { kind: "active" };

  await tx.accessCode.updateMany({
    where: { id: admission.id, redeemedByUserId: userId, redeemedAt: { not: null } },
    data: { redeemedByUserId: null },
  });
  // Defensive parity with the manual reset below: a redemption predating the
  // welcome marker could in principle still have it null here. A timed
  // code's own redemption already sets it, so this is normally a no-op.
  await tx.user.updateMany({
    where: { id: userId, activationWelcomeShownAt: null },
    data: { activationWelcomeShownAt: new Date() },
  });
  return { kind: "expired" };
}

/**
 * Returns whether the learner has consumed an access code and may use the
 * app. A time-limited code's admission is detached the same way a manual
 * "Deactivate access" is once its validity window has elapsed -- there is no
 * background job, so this is the point where an expired grant is actually
 * enforced. The cheap unlocked read below is only ever used to decide
 * whether the code even looks expired; the actual detach always re-resolves
 * under the per-user lock rather than trusting that stale read.
 */
export async function hasRedeemedAccessCode(userId: string): Promise<boolean> {
  const redemption = await prisma.accessCode.findUnique({
    where: { redeemedByUserId: userId },
    select: { redeemedAt: true, validityDays: true },
  });
  if (redemption === null) return false;
  if (redemption.validityDays === null || redemption.redeemedAt === null) return true;

  const expiresAt = redemption.redeemedAt.getTime() + redemption.validityDays * MS_PER_DAY;
  if (Date.now() < expiresAt) return true;

  const resolution = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${redemptionLockKey(userId)})::bigint)`;
      return resolveAdmissionLocked(tx, userId);
    },
    { timeout: ACCESS_CODE_TRANSACTION_TIMEOUT_MS },
  );
  return resolution.kind === "active";
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

        // An expired admission is detached here, inside this same locked
        // transaction, rather than left for a separate hasRedeemedAccessCode
        // call: otherwise a stale/direct submission with a replacement code
        // would see the expired admission as still current and report
        // "already activated" without actually consuming the new code.
        const existingAdmission = await resolveAdmissionLocked(tx, userId);
        if (existingAdmission.kind === "active") return { kind: "alreadyActivated" };

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

        // The route may associate the safe operational event with this opaque
        // row ID, but must never receive or retain another copy of the bearer
        // code itself.
        const redeemedCode = await tx.accessCode.findUnique({
          where: { code },
          select: { id: true },
        });
        if (!redeemedCode) {
          throw new Error("Claimed access code could not be resolved.");
        }

        const welcomeMarker = await tx.user.updateMany({
          where: { id: userId, activationWelcomeShownAt: null },
          data: { activationWelcomeShownAt: new Date() },
        });

        return {
          kind: "redeemed",
          showWelcome: welcomeMarker.count === 1,
          accessCodeId: redeemedCode.id,
        };
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
