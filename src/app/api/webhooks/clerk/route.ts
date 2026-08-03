import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { prisma } from "@/lib/prisma";
import { syncClerkUserFromWebhook } from "@/lib/app-user";

export const runtime = "nodejs";

const USER_EVENT_TYPES = new Set(["user.created", "user.updated"]);

/**
 * Clerk delivers Svix webhooks at least once. Only payloads with a verified
 * primary email can create or update a local identity; an unverified user
 * delivery is recorded and acknowledged until a later verified update arrives.
 * The delivery record is committed in the same transaction as any local
 * mutation. A duplicate Svix delivery is therefore a no-op; a failed local
 * mutation returns 500 so Clerk retries it.
 *
 * `user.deleted` is deliberately not handled here. Deleting a local User
 * cascades through essays, quotas, and subscriptions, so it needs its own
 * retention and Stripe-cancellation policy rather than an auth sync shortcut.
 */
export async function POST(request: NextRequest) {
  const deliveryId = request.headers.get("svix-id")?.trim();
  if (!deliveryId) {
    return NextResponse.json({ error: "Missing webhook delivery ID" }, { status: 400 });
  }

  let event;
  try {
    event = await verifyWebhook(request);
  } catch (error) {
    console.error("Clerk webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (!USER_EVENT_TYPES.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.clerkWebhookEvent.createMany({
        data: [{ id: deliveryId, type: event.type }],
        skipDuplicates: true,
      });

      if (count === 0) {
        return;
      }

      // The Set above narrows runtime input, while this explicit branch gives
      // TypeScript the `UserJSON` payload used by the shared sync helper.
      if (event.type === "user.created" || event.type === "user.updated") {
        await syncClerkUserFromWebhook(event.data, tx);
      }
    });
  } catch (error) {
    console.error("Clerk webhook user sync failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
