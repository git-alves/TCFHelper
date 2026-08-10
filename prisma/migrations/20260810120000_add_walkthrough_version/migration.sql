-- Nullable, additive column: null means this learner has never completed or
-- skipped a walkthrough, so the app auto-starts it for them. This migration
-- adds the column only -- it does not touch any existing row's value, so
-- every existing account would read as null (and auto-start the tour) until
-- a separate, explicitly-approved backfill sets their starting version. That
-- backfill is intentionally not part of this file: it mutates existing data
-- and must not run on the automatic additive-migration allowlist.
ALTER TABLE "User" ADD COLUMN "walkthroughCompletedVersion" INTEGER;
