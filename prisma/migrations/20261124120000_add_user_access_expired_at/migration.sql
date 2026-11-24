-- Additive nullable outcome marker. No historical backfill is possible or
-- intended: null preserves the previous ordinary activation experience until
-- a post-deploy timed admission actually expires.
ALTER TABLE "User" ADD COLUMN "accessExpiredAt" TIMESTAMP(3);
