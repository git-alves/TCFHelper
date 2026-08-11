-- This durable user-level marker keeps the first-redemption welcome handoff
-- one-time even when an owner later deactivates a learner's admission and the
-- learner redeems a newly issued code. It is nullable and additive, so it
-- does not mutate or reclassify any existing account; an owner-triggered
-- reset marks a selected legacy admission later if needed.
ALTER TABLE "User" ADD COLUMN "activationWelcomeShownAt" TIMESTAMP(3);
