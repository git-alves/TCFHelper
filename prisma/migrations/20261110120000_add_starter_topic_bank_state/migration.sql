-- Purely additive singleton state. Existing Topic rows retain their exact
-- meaning; the first live deployment creates this record after reconciling
-- the current starter bank.
CREATE TABLE "StarterTopicBankState" (
    "id" INTEGER NOT NULL,
    "version" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarterTopicBankState_pkey" PRIMARY KEY ("id")
);
