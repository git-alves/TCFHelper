-- Additive with a permanent default: safe for a still-live previous app
-- version during an additive-migration rollout. That version's upsert never
-- references this column, so inserts fall back to the default and updates
-- leave it untouched -- the durable daily-attempt cap simply is not enforced
-- for requests an old instance handles, the same transient gap already
-- accepted for lastAttemptAt.
ALTER TABLE "ExampleGenerationQuota"
  ADD COLUMN "dailyAttemptCount" INTEGER NOT NULL DEFAULT 0;
