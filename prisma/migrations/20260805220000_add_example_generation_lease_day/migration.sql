-- Persists the UTC day a model-answer generation was reserved for, so a
-- failed generation can be refunded against the exact day its slot was
-- claimed from — never "today" at refund time, which could be a different
-- day than the reservation if a request straddles UTC midnight.
--
-- The default is a genuine UTC-midnight value, not a placeholder, and is
-- kept permanently rather than dropped after backfill: an additive
-- migration runs before the new app version is live, so the still-live
-- previous version's lease upsert (which does not know about this column)
-- must still insert a row with a correct value here, not merely a
-- NOT-NULL-satisfying one.
ALTER TABLE "ExampleGenerationLease"
  ADD COLUMN "dayStartedAt" TIMESTAMP(3) NOT NULL DEFAULT (date_trunc('day', now() AT TIME ZONE 'UTC'));
