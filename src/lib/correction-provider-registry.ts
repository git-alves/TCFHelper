import "server-only";

import { geminiCorrectionProvider } from "@/lib/providers/gemini-correction-provider";
import { openRouterCorrectionProvider } from "@/lib/providers/openrouter-correction-provider";
import type { CorrectionProvider, CorrectionProviderId } from "@/lib/correction-provider";

// Adding a future adapter (LiteLLM, a native OpenAI/Anthropic integration)
// is meant to be: implement CorrectionProvider in a new file under
// src/lib/providers/, add its id to CORRECTION_PROVIDER_IDS
// (correction-provider.ts), and register it here. No change to the route or
// the admin UI structure.
const PROVIDERS: Record<CorrectionProviderId, CorrectionProvider> = {
  gemini: geminiCorrectionProvider,
  openrouter: openRouterCorrectionProvider,
};

export function getCorrectionProvider(id: CorrectionProviderId): CorrectionProvider {
  return PROVIDERS[id];
}
