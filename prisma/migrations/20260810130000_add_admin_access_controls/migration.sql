-- Administrative access and activation are intentionally additive: no
-- existing learner is blocked or promoted, and all existing accounts remain
-- unactivated until an explicit access-code redemption policy is applied.
ALTER TABLE "User"
  ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "CorrectionUsage" (
  "userId" TEXT NOT NULL,
  "dayStartedAt" TIMESTAMP(3) NOT NULL,
  "dailyRequestCount" INTEGER NOT NULL DEFAULT 0,
  "monthStartedAt" TIMESTAMP(3) NOT NULL,
  "monthlyRequestCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CorrectionUsage_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "UserQuotaOverride" (
  "userId" TEXT NOT NULL,
  "translationRequestsPerMinute" INTEGER,
  "translationCharactersPerMinute" INTEGER,
  "translationCharactersPerMonth" INTEGER,
  "exampleGenerationsPerDay" INTEGER,
  "correctionRequestsPerDay" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserQuotaOverride_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "AccessCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "redeemedAt" TIMESTAMP(3),
  "redeemedByUserId" TEXT,
  CONSTRAINT "AccessCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccessCode_code_key" ON "AccessCode"("code");
CREATE UNIQUE INDEX "AccessCode_redeemedByUserId_key" ON "AccessCode"("redeemedByUserId");
CREATE INDEX "AccessCode_redeemedAt_idx" ON "AccessCode"("redeemedAt");

ALTER TABLE "CorrectionUsage"
  ADD CONSTRAINT "CorrectionUsage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserQuotaOverride"
  ADD CONSTRAINT "UserQuotaOverride_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccessCode"
  ADD CONSTRAINT "AccessCode_redeemedByUserId_fkey"
  FOREIGN KEY ("redeemedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
