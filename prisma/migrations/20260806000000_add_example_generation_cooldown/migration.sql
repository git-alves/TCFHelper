-- Nullable and additive: safe for a still-live previous app version during
-- an additive-migration rollout, since that version simply never writes it.
ALTER TABLE "ExampleGenerationQuota"
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3);
