-- Purely additive: a null validityDays means every existing code keeps its
-- current lifetime behavior. Only newly generated timed codes set it.
ALTER TABLE "AccessCode" ADD COLUMN "validityDays" INTEGER;

-- Matches MAX_VALIDITY_DAYS in src/lib/admin-access-codes.ts. A large but
-- in-range INTEGER can still overflow what JavaScript's Date can represent
-- once added to redeemedAt, so this backstops the API/UI bound rather than
-- trusting application code alone to keep every write in range.
ALTER TABLE "AccessCode" ADD CONSTRAINT "AccessCode_validityDays_range"
  CHECK ("validityDays" IS NULL OR ("validityDays" >= 1 AND "validityDays" <= 3650));
