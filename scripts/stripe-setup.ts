/**
 * One-time setup script: creates the TCF Helper Pro product and its monthly
 * price in Stripe. Run with `npm run stripe:setup` after setting
 * STRIPE_SECRET_KEY. Prints the price ID to store as STRIPE_PRICE_ID.
 *
 * Safe to re-run: it looks up an existing active product by name before
 * creating a new one, and reuses an existing recurring price if one matches.
 */
import "dotenv/config";
import Stripe from "stripe";

const PRODUCT_NAME = "TCF Helper Pro";
const PRICE_UNIT_AMOUNT = 1500; // $15.00
const PRICE_CURRENCY = "usd";
const PRICE_INTERVAL = "month";

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env first.");
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2026-06-24.dahlia",
    typescript: true,
  });

  const existingProducts = await stripe.products.search({
    query: `name:"${PRODUCT_NAME}" AND active:"true"`,
  });

  const product =
    existingProducts.data[0] ??
    (await stripe.products.create({
      name: PRODUCT_NAME,
      description:
        "Unlimited TCF writing practice with automated feedback, topic bank, and AI-generated model texts.",
    }));

  console.log(`Product: ${product.id} (${product.name})`);

  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 100,
  });

  const price =
    existingPrices.data.find(
      (p) =>
        p.unit_amount === PRICE_UNIT_AMOUNT &&
        p.currency === PRICE_CURRENCY &&
        p.recurring?.interval === PRICE_INTERVAL
    ) ??
    (await stripe.prices.create({
      product: product.id,
      unit_amount: PRICE_UNIT_AMOUNT,
      currency: PRICE_CURRENCY,
      recurring: { interval: PRICE_INTERVAL },
    }));

  console.log(`Price: ${price.id} (${(price.unit_amount ?? 0) / 100} ${price.currency}/${PRICE_INTERVAL})`);
  console.log("\nSet this in your environment:");
  console.log(`STRIPE_PRICE_ID=${price.id}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
