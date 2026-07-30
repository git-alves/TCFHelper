-- Contract step of a two-part rollout. Only run this against a live
-- deployment after the new app code (which requires the StripeEvent table
-- from the expand migration, and no longer upserts by stripeCustomerId)
-- has been deployed and is confirmed healthy — see the README's
-- "Upgrading a live deployment" section. Running it earlier would break
-- whatever webhook handler is still upserting Subscription rows by the
-- unique stripeCustomerId index this drops.

-- Preflight: Subscription rows are only ever written by the webhook
-- handler, which always sets stripeSubscriptionId, so this should never
-- fire against real data. But blindly running `SET NOT NULL` against a
-- deployed database with a stray NULL row would fail with an opaque
-- constraint-violation error; fail loudly here instead with guidance on
-- what to do before rerunning this migration.
--
-- If this DOES fire: fix the offending row(s) (backfill stripeSubscriptionId
-- from Stripe, or delete the row) and then run
-- `npx prisma migrate resolve --rolled-back 20260729150000_require_subscription_id_and_drop_legacy_unique`
-- before rerunning `prisma migrate deploy` — the RAISE EXCEPTION below
-- aborts this transaction, but Prisma still records the migration as
-- failed and refuses to retry it until you tell it the rollback happened.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Subscription" WHERE "stripeSubscriptionId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make Subscription.stripeSubscriptionId NOT NULL: % row(s) have a NULL value. Backfill each row''s stripeSubscriptionId from Stripe, or delete the row, before rerunning this migration.',
      (SELECT count(*) FROM "Subscription" WHERE "stripeSubscriptionId" IS NULL);
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "stripeSubscriptionId" SET NOT NULL;

-- DropIndex
DROP INDEX "Subscription_stripeCustomerId_key";
