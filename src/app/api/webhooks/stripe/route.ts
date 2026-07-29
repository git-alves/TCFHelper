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

async function syncSubscription(event: Stripe.Event) {
  // The webhook payload's shape depends on the API version the *endpoint*
  // (or account default) is pinned to, which we don't control from here —
  // it doesn't have to match the SDK's pinned apiVersion. Re-fetching
  // through our pinned client guarantees the shape we actually coded
  // against, instead of trusting whatever the payload happened to contain.
  const subscriptionId = (event.data.object as Stripe.Subscription).id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.log(`No userId metadata on subscription ${subscription.id}; skipping DB sync.`);
    return;
  }

  const eventCreatedAt = new Date(event.created * 1000);
  const stripeCustomerId = String(subscription.customer);

  const existing = await prisma.subscription.findUnique({
    where: { stripeCustomerId },
    select: { lastStripeEventAt: true },
  });

  // Stripe doesn't guarantee webhook delivery order. If we've already
  // applied a newer event for this customer, don't let a late/out-of-order
  // one overwrite it — this also protects against a stale event for an
  // old subscription clobbering a newer one after cancel + resubscribe.
  if (existing?.lastStripeEventAt && existing.lastStripeEventAt >= eventCreatedAt) {
    console.log(
      `Skipping stale Stripe event for customer ${stripeCustomerId} (event ${event.id})`
    );
    return;
  }

  const item = subscription.items.data[0];
  const data = {
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: item?.price.id,
    status: mapStripeStatus(subscription.status),
    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    lastStripeEventAt: eventCreatedAt,
  };

  await prisma.subscription.upsert({
    where: { stripeCustomerId },
    create: data,
    update: data,
  });
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
