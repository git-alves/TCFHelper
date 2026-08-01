import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { syncSubscription } from "@/lib/sync-stripe-subscription";

export const runtime = "nodejs";

const SUBSCRIPTION_EVENT_TYPES = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

/**
 * Verifies and logs Stripe billing events. There is no checkout flow or
 * feature gate wired up yet, so this only keeps the Subscription table in
 * sync for events that already carry a valid local application CUID in
 * metadata; everything else is accepted and logged so Stripe considers
 * delivery successful.
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
