import Anthropic from "@anthropic-ai/sdk";

let cachedClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

// Constructed lazily so importing this module (e.g. during `next build`)
// doesn't require ANTHROPIC_API_KEY — only routes that actually call Claude
// do, and they'll fail loudly at request time instead of at build time.
export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return Reflect.get(getAnthropicClient(), prop);
  },
});
