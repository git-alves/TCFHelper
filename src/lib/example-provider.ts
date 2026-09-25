import type { GenerateModelAnswerParams } from "@/lib/gemini";

// The extensible seam between example (model-answer) generation and
// whichever AI backend actually writes the example, mirroring
// correction-provider.ts for the essay-correction path. gemini.ts and the
// adapters under src/lib/providers each implement this contract; the route
// and the admin panel only ever see ExampleProviderId + ExampleProvider,
// never a provider-specific type. Adding a future adapter (LiteLLM, a native
// OpenAI/Anthropic integration) is meant to be "add one id + one adapter
// file + register it" -- no change to this file's shape, the route, or the
// admin UI structure.
export const EXAMPLE_PROVIDER_IDS = ["gemini", "openrouter"] as const;
export type ExampleProviderId = (typeof EXAMPLE_PROVIDER_IDS)[number];

// Preserves today's only-ever-Gemini behavior for a deployment with no
// admin override stored yet (see AppConfig.exampleProvider).
export const DEFAULT_EXAMPLE_PROVIDER: ExampleProviderId = "gemini";

export function isExampleProviderId(value: string): value is ExampleProviderId {
  return (EXAMPLE_PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Admin-panel overrides (AppConfig, see app-config.ts) for a single call,
 * layered over each adapter's own env-var defaults.
 */
export interface ExampleProviderOverrides {
  apiKey?: string | null;
  model?: string | null;
}

/** A provider credential (API key, or a required model with no default) is missing. */
export class ExampleProviderNotConfiguredError extends Error {}
/** The provider's own rate limit was hit. */
export class ExampleProviderRateLimitedError extends Error {}

/**
 * The provider responded with a non-2xx status. The constructor accepts only
 * the HTTP status -- never a message -- so a provider's own error text (which
 * could echo back part of the request) can never reach a log or a learner.
 */
export class ExampleProviderRequestError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Example provider request failed (${status}).`);
    this.status = status;
  }
}

/**
 * The request never reached the provider or never received a response at
 * all (network failure, DNS failure, or a request timeout) -- there is no
 * HTTP status to report.
 */
export class ExampleProviderTransportError extends Error {
  constructor() {
    super("Example provider request could not be completed.");
  }
}

export interface ExampleProvider {
  readonly id: ExampleProviderId;
  /** True when a server-side credential is available for a provider call. */
  hasConfiguredCredentials(overrides?: ExampleProviderOverrides): boolean;
  /**
   * Generates a raw example answer (not yet length-validated -- see
   * model-answer-generator.ts, which applies that check uniformly regardless
   * of provider).
   */
  generateExample(params: GenerateModelAnswerParams, overrides?: ExampleProviderOverrides): Promise<string>;
}
