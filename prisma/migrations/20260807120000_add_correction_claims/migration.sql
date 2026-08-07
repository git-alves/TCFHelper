-- A correction key includes the normalized task, topic, and submitted text.
-- It stays nullable on Essay so an additive rollout remains compatible with
-- older live instances; the server performs an exact legacy lookup for rows
-- that do not yet have a key hash.
ALTER TABLE "Essay" ADD COLUMN "correctionKeyHash" TEXT;

-- PostgreSQL permits multiple NULLs in a unique index, so pre-rollout essays
-- remain compatible while every newly persisted correction key is durable.
CREATE UNIQUE INDEX "Essay_userId_correctionKeyHash_key"
  ON "Essay"("userId", "correctionKeyHash");

-- The correction feedback is written in the interface locale selected for
-- that request. Old rows stay NULL and use the limited legacy presentation.
ALTER TABLE "Feedback" ADD COLUMN "feedbackLocale" "Locale";

-- The composite primary key gives each learner exactly one active claim for a
-- particular correction request. Expiry lets a later request recover after a
-- crashed or timed-out server invocation.
CREATE TABLE "CorrectionLease" (
  "userId" TEXT NOT NULL,
  "correctionKeyHash" TEXT NOT NULL,
  "claimToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CorrectionLease_pkey" PRIMARY KEY ("userId", "correctionKeyHash")
);

CREATE INDEX "CorrectionLease_expiresAt_idx" ON "CorrectionLease"("expiresAt");

ALTER TABLE "CorrectionLease"
  ADD CONSTRAINT "CorrectionLease_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
