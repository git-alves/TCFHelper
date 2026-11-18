-- Nullable JSON chain columns preserve the exact legacy single-provider
-- behavior until an owner explicitly saves a chain. New alert/accounting
-- tables are empty and do not change any existing record.
ALTER TABLE "AppConfig" ADD COLUMN "correctionModelChain" JSONB;
ALTER TABLE "AppConfig" ADD COLUMN "exampleModelChain" JSONB;

CREATE TABLE "ModelChainAlert" (
  "id" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "stepKey" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "dismissedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModelChainAlert_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ModelChainAlert_section_stepKey_key" ON "ModelChainAlert"("section", "stepKey");

CREATE TABLE "ModelChainReserveUse" (
  "id" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModelChainReserveUse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ModelChainReserveUse_section_createdAt_idx" ON "ModelChainReserveUse"("section", "createdAt");
