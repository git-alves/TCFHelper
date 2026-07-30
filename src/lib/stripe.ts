import Stripe from "stripe";

let cachedClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  cachedClient = new Stripe(secretKey, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });
  return cachedClient;
}

// Constructed lazily so importing this module (e.g. during `next build`)
// doesn't require STRIPE_SECRET_KEY — only routes that actually call Stripe
// do, and they'll fail loudly at request time instead of at build time.
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return Reflect.get(getStripeClient(), prop);
  },
});
