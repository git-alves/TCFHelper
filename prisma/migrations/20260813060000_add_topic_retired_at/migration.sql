-- Marks a managed OFFICIAL_EXAM starter topic as retired (its prompt was
-- corrected, so a new row was created alongside it) without changing its
-- source or mutating its prompt. A plain nullable column, not a new
-- TopicSource enum value: old application code running during a rolling
-- deploy never reads this column, so it keeps accepting a freshly-retired
-- row exactly as it did before this migration, rather than rejecting it as
-- an unrecognized source until the new deployment is fully live. See
-- seed-topic-sync.ts.
ALTER TABLE "Topic" ADD COLUMN "retiredAt" TIMESTAMP(3);
