-- When the admin last opened /admin/support, so the nav bell can count the
-- tickets that arrived (or were reopened by the learner) since. Nullable and
-- additive: null means "never opened", under which every open ticket counts
-- as new. No existing row is touched, so nothing changes meaning, and the
-- still-live previous deployment never reads or writes the column.
ALTER TABLE "User" ADD COLUMN "supportInboxSeenAt" TIMESTAMP(3);
