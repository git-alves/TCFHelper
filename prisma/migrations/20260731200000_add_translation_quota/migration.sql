-- Keep one durable quota row per learner. The application serializes updates
-- for a user with a transaction-scoped PostgreSQL advisory lock, then resets
-- the minute/month counters when their UTC windows change.
CREATE TABLE "TranslationQuota" (
    "userId" TEXT NOT NULL,
    "minuteStartedAt" TIMESTAMP(3) NOT NULL,
    "minuteRequestCount" INTEGER NOT NULL DEFAULT 0,
    "minuteCharacterCount" INTEGER NOT NULL DEFAULT 0,
    "monthStartedAt" TIMESTAMP(3) NOT NULL,
    "monthCharacterCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationQuota_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "TranslationQuota"
  ADD CONSTRAINT "TranslationQuota_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
