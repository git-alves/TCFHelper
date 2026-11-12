-- Three defaulted counters on CorrectionUsage, so a correction that fails
-- because of the AI provider can be given back to the learner (the daily and
-- monthly request counts are decremented, as example generation already does)
-- while still being recorded:
--   * "dailyAttemptCount": every provider attempt of the day, never refunded,
--     the durable cap that stops refunded failures from allowing unlimited
--     paid provider calls;
--   * "dailyFailedCount" / "monthlyFailedCount": refunded failures per window,
--     for the admin's usage view.
--
-- Purely additive: each column is NOT NULL DEFAULT 0, so existing rows keep
-- every count they have (no backfill: past failures were never recorded) and
-- the still-live previous deployment's inserts and updates, which do not know
-- these columns, remain valid. During that brief overlap an old instance that
-- rolls a row to a new day would leave the previous day's attempt and failed
-- counts in place; they only ever affect the new window's attempt cap and the
-- admin display, and clear at the next window roll.
ALTER TABLE "CorrectionUsage"
    ADD COLUMN "dailyAttemptCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "dailyFailedCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "monthlyFailedCount" INTEGER NOT NULL DEFAULT 0;
