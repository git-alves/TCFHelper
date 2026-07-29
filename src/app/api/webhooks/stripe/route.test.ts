import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const { db, retrieveMock } = vi.hoisted(() => {
  return {
    db: {
      stripeEventIds: new Set<string>(),
      subscriptions: new Map<string, Record<string, unknown>>(),
      locks: new Map<string, Promise<void>>(),
    },
    retrieveMock: vi.fn(),
  };
});

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: {
      retrieve: retrieveMock,
    },
  },
}));

// A minimal stand-in for Prisma's interactive $transaction: dedupes by
// event ID the same way a unique-constraint violation would, and serializes
// concurrent callers of $executeRaw that share a lock key exactly like a
// Postgres advisory lock held for the lifetime of the transaction — so
// these tests exercise the same serialization the real DB provides.
vi.mock("@/lib/prisma", async () => {
  const { Prisma } = await import("@/generated/prisma/client");

  return {
    prisma: {
      async $transaction(callback: (tx: unknown) => Promise<unknown>) {
        let releaseOwnLock: (() => void) | undefined;

        const tx = {
          stripeEvent: {
            async create({ data }: { data: { id: string; type: string } }) {
              if (db.stripeEventIds.has(data.id)) {
                throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
                  code: "P2002",
                  clientVersion: "test",
                });
              }
              db.stripeEventIds.add(data.id);
            },
          },
          async $executeRaw(_strings: TemplateStringsArray, ...values: unknown[]) {
            const key = String(values[0]);
            const previousHolder = db.locks.get(key) ?? Promise.resolve();
            let resolveOwnLock: () => void;
            const ownLock = new Promise<void>((resolve) => {
              resolveOwnLock = resolve;
            });
            db.locks.set(
              key,
              previousHolder.then(() => ownLock)
            );
            releaseOwnLock = () => resolveOwnLock();
            await previousHolder;
          },
          subscription: {
            async upsert({
              where,
              create,
              update,
            }: {
              where: { stripeSubscriptionId: string };
              create: Record<string, unknown>;
              update: Record<string, unknown>;
            }) {
              const existing = db.subscriptions.get(where.stripeSubscriptionId);
              const row = { ...(existing ?? create), ...update };
              db.subscriptions.set(where.stripeSubscriptionId, row);
              return row;
            },
          },
        };

        try {
          return await callback(tx);
        } finally {
          releaseOwnLock?.();
        }
      },
    },
  };
});

const { syncSubscription } = await import("./route");

function makeSubscription(overrides: { id: string; status?: string }) {
  return {
    id: overrides.id,
    metadata: { userId: "user_1" },
    customer: "cus_1",
    status: overrides.status ?? "active",
    cancel_at_period_end: false,
    items: { data: [{ price: { id: "price_1" }, current_period_end: 1_800_000_000 }] },
  } as unknown as Stripe.Subscription;
}

function makeEvent(overrides: { id: string; created: number; subscriptionId: string }) {
  return {
    id: overrides.id,
    created: overrides.created,
    type: "customer.subscription.updated",
    data: { object: { id: overrides.subscriptionId } },
  } as unknown as Stripe.Event;
}

beforeEach(() => {
  db.stripeEventIds.clear();
  db.subscriptions.clear();
  db.locks.clear();
  retrieveMock.mockReset();
});

describe("syncSubscription", () => {
  it("does not let a second subscription for the same customer overwrite the first", async () => {
    retrieveMock.mockImplementation(async (id: string) => makeSubscription({ id }));

    await syncSubscription(
      makeEvent({ id: "evt_1", created: 1_700_000_000, subscriptionId: "sub_A" })
    );
    await syncSubscription(
      makeEvent({ id: "evt_2", created: 1_700_000_001, subscriptionId: "sub_B" })
    );

    expect(db.subscriptions.size).toBe(2);
    expect(db.subscriptions.get("sub_A")).toBeTruthy();
    expect(db.subscriptions.get("sub_B")).toBeTruthy();
  });

  it("is a no-op when the same Stripe event is redelivered", async () => {
    retrieveMock.mockImplementation(async (id: string) => makeSubscription({ id }));

    const event = makeEvent({ id: "evt_dup", created: 1_700_000_000, subscriptionId: "sub_A" });

    await syncSubscription(event);
    await syncSubscription(event);

    expect(retrieveMock).toHaveBeenCalledTimes(1);
  });

  it("serializes concurrent, same-second events for one subscription instead of racing", async () => {
    const order: string[] = [];
    let callCount = 0;

    retrieveMock.mockImplementation(async (id: string) => {
      callCount += 1;
      const label = callCount === 1 ? "first" : "second";
      order.push(`${label}-start`);
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push(`${label}-end`);
      return makeSubscription({ id, status: label === "first" ? "active" : "canceled" });
    });

    // Same subscription, same second (event.created has second granularity
    // on the real Stripe API), distinct event IDs — the old `>=` timestamp
    // gate would have silently dropped whichever arrived second.
    const eventA = makeEvent({ id: "evt_a", created: 1_700_000_000, subscriptionId: "sub_A" });
    const eventB = makeEvent({ id: "evt_b", created: 1_700_000_000, subscriptionId: "sub_A" });

    await Promise.all([syncSubscription(eventA), syncSubscription(eventB)]);

    expect(retrieveMock).toHaveBeenCalledTimes(2);
    // No interleaving: whichever transaction acquires the lock first runs
    // its retrieve-to-write section to completion before the other starts.
    expect(order).toEqual(["first-start", "first-end", "second-start", "second-end"]);
    expect(db.subscriptions.get("sub_A")?.status).toBe("CANCELED");
  });
});
