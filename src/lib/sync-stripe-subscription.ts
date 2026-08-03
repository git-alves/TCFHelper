import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@prisma/client";

export async function syncSubscription(event: Stripe.Event) {
  const subscriptionId = (event.data.object as Stripe.Subscription).id;

  await prisma.$transaction(
    async (tx) => {
      // Stripe redelivers events (at-least-once, no ordering guarantee) and
      // `event.created` is only second-granular, so neither the event ID
      // nor a timestamp comparison is a safe way to gate a write. Instead,
      // record the event ID first: `skipDuplicates` compiles to `ON
      // CONFLICT DO NOTHING`, so a redelivery is a no-op insert rather than
      // a unique-violation error. That distinction matters — Postgres
      // aborts the entire transaction on a query error, and Prisma's
      // interactive transactions don't take a savepoint per query, so
      // catching that error and continuing to use `tx` afterwards would
      // fail every subsequent statement in this transaction.
      const { count } = await tx.stripeEvent.createMany({
        data: [{ id: event.id, type: event.type }],
        skipDuplicates: true,
      });
      if (count === 0) {
        console.log(`Skipping already-processed Stripe event ${event.id}`);
        return;
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${subscriptionId})::bigint)`;

      // The webhook payload's shape depends on the API version the
      // *endpoint* (or account default) is pinned to, which we don't
      // control from here — it doesn't have to match the SDK's pinned
      // apiVersion. Re-fetching through our pinned client guarantees the
      // shape we actually coded against. It also means whichever delivery
      // for this subscription runs last (now serialized by the lock above)
      // always writes Stripe's true current state, regardless of which
      // event triggered it — so event ordering doesn't matter for
      // correctness, only for not doing redundant work.
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const userId = subscription.metadata?.userId;
      if (!userId) {
        console.log(`No userId metadata on subscription ${subscription.id}; skipping DB sync.`);
        return;
      }

      // Stripe metadata is the application CUID that existed before the
      // Clerk migration, not Clerk's `user_…` subject. Confirming it still
      // resolves to a local row before the upsert preserves the foreign-key
      // boundary and makes a bad/future checkout payload a safe no-op instead
      // of an endlessly retried database constraint failure.
      const localUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!localUser) {
        console.error(
          `Subscription ${subscription.id} references no local application user; skipping DB sync.`,
        );
        return;
      }

      const item = subscription.items.data[0];
      const data = {
        userId: localUser.id,
        stripeCustomerId: String(subscription.customer),
        stripeSubscriptionId: subscription.id,
        stripePriceId: item?.price.id,
        status: mapStripeStatus(subscription.status),
        currentPeriodEnd: item?.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        lastStripeEventAt: new Date(event.created * 1000),
      };

      await tx.subscription.upsert({
        where: { stripeSubscriptionId: subscription.id },
        create: data,
        update: data,
      });
    },
    { timeout: 15000 }
  );
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "paused":
      return "PAUSED";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "unpaid":
      return "UNPAID";
  }
}
