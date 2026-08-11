-- Purely additive: denormalizes each redemption's expiry (redeemedAt +
-- validityDays) into a real column, computed once at redemption time
-- rather than recomputed ad hoc in application code on every read. This
-- lets an ordinary Prisma query filter and compare it directly -- most
-- importantly, the admin users list's Activated/Unactivated status filter,
-- which previously had to load every currently-redeemed code into
-- application memory to resolve this by hand.
ALTER TABLE "AccessCode" ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Backfill existing redemptions. NULL correctly means "lifetime" for every
-- row this touches, since it only touches already-redeemed, time-limited
-- rows -- an unredeemed code's expiresAt has no meaning yet and stays NULL
-- until (if ever) redeemAccessCode sets it.
UPDATE "AccessCode"
SET "expiresAt" = "redeemedAt" + ("validityDays" * INTERVAL '1 day')
WHERE "redeemedAt" IS NOT NULL AND "validityDays" IS NOT NULL;
