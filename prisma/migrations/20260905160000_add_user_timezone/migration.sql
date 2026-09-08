-- Nullable and additive: existing rows have no reported timezone yet, and
-- nothing reads this column until the client starts reporting it.
ALTER TABLE "User" ADD COLUMN "timezone" TEXT;
