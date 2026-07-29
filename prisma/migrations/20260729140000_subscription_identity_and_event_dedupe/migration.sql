-- Preflight: Subscription rows are only ever written by the webhook
-- handler, which always sets stripeSubscriptionId, so this should never
-- fire against real data. But blindly running `SET NOT NULL` against a
-- deployed database with a stray NULL row would fail with an opaque
-- constraint-violation error; fail loudly here instead with guidance on
-- what to do before rerunning this migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Subscription" WHERE "stripeSubscriptionId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make Subscription.stripeSubscriptionId NOT NULL: % row(s) have a NULL value. Backfill each row''s stripeSubscriptionId from Stripe, or delete the row, before rerunning this migration.',
      (SELECT count(*) FROM "Subscription" WHERE "stripeSubscriptionId" IS NULL);
  END IF;
END $$;

-- DropIndex
DROP INDEX "Subscription_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "Subscription" ALTER COLUMN "stripeSubscriptionId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);
