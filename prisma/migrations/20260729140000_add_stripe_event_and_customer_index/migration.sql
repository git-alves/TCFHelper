-- Expand step of a two-part rollout (see the "contract" migration that
-- follows this one, and the README's "Upgrading a live deployment"
-- section). This migration is purely additive — it can be applied while
-- the currently-deployed webhook handler (which still upserts
-- Subscription rows by the unique stripeCustomerId) is running, because it
-- neither touches that column nor removes its unique index.

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Postgres allows a plain index to coexist with the pre-existing unique
-- index on the same column, so the new lookup path is ready before the
-- old unique index is dropped in the contract migration.
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");
