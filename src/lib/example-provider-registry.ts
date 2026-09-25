import "server-only";

import { geminiExampleProvider } from "@/lib/providers/gemini-example-provider";
import { openRouterExampleProvider } from "@/lib/providers/openrouter-example-provider";
import type { ExampleProvider, ExampleProviderId } from "@/lib/example-provider";

// Adding a future adapter (LiteLLM, a native OpenAI/Anthropic integration)
// is meant to be: implement ExampleProvider in a new file under
// src/lib/providers/, add its id to EXAMPLE_PROVIDER_IDS
// (example-provider.ts), and register it here. No change to the route or
// the admin UI structure.
const PROVIDERS: Record<ExampleProviderId, ExampleProvider> = {
  gemini: geminiExampleProvider,
  openrouter: openRouterExampleProvider,
};

export function getExampleProvider(id: ExampleProviderId): ExampleProvider {
  return PROVIDERS[id];
}
