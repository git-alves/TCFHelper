import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { SubscriptionStatus } from "@/generated/prisma/client";

export const runtime = "nodejs";

const SUBSCRIPTION_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

/**
 * Verifies and logs Stripe billing events. There is no checkout flow or
 * feature gate wired up yet, so this only keeps the Subscription table in
 * sync for events that already carry a userId in metadata; everything else
 * is accepted and logged so Stripe considers delivery successful.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`Stripe webhook received: ${event.type}`);

  if (SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
    await syncSubscription(event);
  }

  return NextResponse.json({ received: true });
}

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

      const item = subscription.items.data[0];
      const data = {
        userId,
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
