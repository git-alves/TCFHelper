import "server-only";

import type { Prisma } from "@prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * expiresAt is normally trustworthy on its own -- it is written once, at
 * redemption time (see redeemAccessCode in access-code.ts). But a row
 * redeemed by an app instance that predates this column existing in code
 * (e.g. one still serving requests during the deploy that added it) can
 * have a null expiresAt even though validityDays says it should have had
 * one. Falling back to deriving it from redeemedAt + validityDays in that
 * specific case keeps every consumer correct for a row written during that
 * gap, not just for one written after it closed.
 */
export function resolveExpiresAt(row: {
  redeemedAt: Date | null;
  validityDays: number | null;
  expiresAt: Date | null;
}): Date | null {
  if (row.expiresAt !== null) return row.expiresAt;
  if (row.validityDays === null || row.redeemedAt === null) return null;
  return new Date(row.redeemedAt.getTime() + row.validityDays * MS_PER_DAY);
}

/**
 * A database-side (not application-memory) predicate for "this AccessCode
 * row currently grants live access," safe against the same mixed-version
 * rollout gap resolveExpiresAt guards against: a row can only be trusted as
 * "lifetime" (an unconditionally live null expiresAt) when validityDays is
 * ALSO null. A row with a non-null validityDays but a null expiresAt --
 * i.e. one written by an app instance that predates this column, during a
 * deploy that added it -- is deliberately excluded from "live" here rather
 * than assumed live, since Prisma cannot express resolveExpiresAt's date
 * arithmetic fallback in a WHERE clause. Such a row self-heals (gets a
 * real, persisted expiresAt) the next time hasRedeemedAccessCode or
 * resolveAdmissionLocked actually reads it -- see access-code.ts -- after
 * which it is classified correctly here too, with no further gap.
 */
export function accessCodeIsLiveWhere(now: Date): Prisma.AccessCodeWhereInput {
  return {
    OR: [
      { expiresAt: null, validityDays: null },
      { expiresAt: { gt: now } },
    ],
  };
}
