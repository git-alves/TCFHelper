-- Purely additive: a null lastActiveAt means this account has never been
-- observed active (or predates this column), which is exactly correct for
-- every existing row.
ALTER TABLE "User" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");
