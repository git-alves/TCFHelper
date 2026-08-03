import { describe, expect, it, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

const { db, retrieveMock } = vi.hoisted(() => {
  return {
    db: {
      stripeEventIds: new Set<string>(),
      subscriptions: new Map<string, Record<string, unknown>>(),
      locks: new Map<string, Promise<void>>(),
      localUserIds: new Set<string>(),
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
// event ID the same way `createMany({ skipDuplicates: true })` compiling to
// `ON CONFLICT DO NOTHING` would (a no-op insert, not a thrown error — a
// real unique-violation would abort the whole Postgres transaction), and
// serializes concurrent callers of $executeRaw that share a lock key
// exactly like a Postgres advisory lock held for the lifetime of the
// transaction — so these tests exercise the same serialization the real DB
// provides.
vi.mock("@/lib/prisma", () => {
  return {
    prisma: {
      async $transaction(callback: (tx: unknown) => Promise<unknown>) {
        let releaseOwnLock: (() => void) | undefined;

        const tx = {
          stripeEvent: {
            async createMany({ data }: { data: { id: string; type: string }[] }) {
              const [{ id }] = data;
              if (db.stripeEventIds.has(id)) {
                return { count: 0 };
              }
              db.stripeEventIds.add(id);
              return { count: 1 };
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
          user: {
            async findUnique({ where }: { where: { id: string } }) {
              return db.localUserIds.has(where.id) ? { id: where.id } : null;
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

const { syncSubscription } = await import("./sync-stripe-subscription");

function makeSubscription(overrides: { id: string; status?: string }) {
  return {
    id: overrides.id,
    metadata: { userId: "cuid_local_user_1" },
    customer: "cus_1",
    status: overrides.status ?? "active",
    cancel_at_period_end: false,
    items: { data: [{ price: { id: "price_1" }, current_period_end: 1_800_000_000 }] },
  } as unknown as Stripe.Subscription;
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
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
  db.localUserIds.clear();
  db.localUserIds.add("cuid_local_user_1");
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

  it("does not treat a Clerk subject in Stripe metadata as the local ownership key", async () => {
    retrieveMock.mockResolvedValue({
      ...makeSubscription({ id: "sub_clerk_subject" }),
      metadata: { userId: "user_clerk_1" },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await syncSubscription(
      makeEvent({ id: "evt_clerk_subject", created: 1_700_000_000, subscriptionId: "sub_clerk_subject" }),
    );

    expect(db.subscriptions.size).toBe(0);
    expect(errorSpy).toHaveBeenCalledWith(
      "Subscription sub_clerk_subject references no local application user; skipping DB sync.",
    );
    errorSpy.mockRestore();
  });

  it("serializes concurrent, same-second events for one subscription instead of racing", async () => {
    const order: string[] = [];
    const firstStarted = deferred();
    const releaseFirst = deferred();
    let callCount = 0;

    // Deterministic barrier instead of a wall-clock delay: the first
    // caller to reach `retrieve` blocks until the test explicitly releases
    // it, so we can assert the second caller hasn't started yet — proving
    // the advisory lock serializes them — without depending on timing.
    retrieveMock.mockImplementation(async (id: string) => {
      callCount += 1;
      if (callCount === 1) {
        order.push("first-start");
        firstStarted.resolve();
        await releaseFirst.promise;
        order.push("first-end");
        return makeSubscription({ id, status: "active" });
      }
      order.push("second-start");
      return makeSubscription({ id, status: "canceled" });
    });

    // Same subscription, same second (event.created has second granularity
    // on the real Stripe API), distinct event IDs — the old `>=` timestamp
    // gate would have silently dropped whichever arrived second.
    const eventA = makeEvent({ id: "evt_a", created: 1_700_000_000, subscriptionId: "sub_A" });
    const eventB = makeEvent({ id: "evt_b", created: 1_700_000_000, subscriptionId: "sub_A" });

    const both = Promise.all([syncSubscription(eventA), syncSubscription(eventB)]);

    await firstStarted.promise;
    // The second transaction is blocked on the advisory lock, so it can't
    // have reached `retrieve` yet even though "first" hasn't finished.
    expect(order).toEqual(["first-start"]);

    releaseFirst.resolve();
    await both;

    expect(retrieveMock).toHaveBeenCalledTimes(2);
    expect(order).toEqual(["first-start", "first-end", "second-start"]);
    expect(db.subscriptions.get("sub_A")?.status).toBe("CANCELED");
  });
});
