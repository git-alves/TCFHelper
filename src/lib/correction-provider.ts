// The extensible seam between the correction route and whichever AI backend
// actually grades an essay. gemini.ts and the adapters under src/lib/providers
// each implement this contract; the route and the admin panel only ever see
// CorrectionProviderId + CorrectionProvider, never a provider-specific type.
// Adding a future adapter (LiteLLM, a native OpenAI/Anthropic integration) is
// meant to be "add one id + one adapter file + register it" -- no change to
// this file's shape, the route, or the admin UI structure.
export const CORRECTION_PROVIDER_IDS = ["gemini", "openrouter"] as const;
export type CorrectionProviderId = (typeof CORRECTION_PROVIDER_IDS)[number];

// Preserves today's only-ever-Gemini behavior for a deployment with no
// admin override stored yet (see AppConfig.correctionProvider).
export const DEFAULT_CORRECTION_PROVIDER: CorrectionProviderId = "gemini";

export function isCorrectionProviderId(value: string): value is CorrectionProviderId {
  return (CORRECTION_PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Admin-panel overrides (AppConfig, see app-config.ts) for a single call,
 * layered over each adapter's own env-var defaults. Kept provider-agnostic
 * so the route never needs to know which concrete env vars back whichever
 * provider is currently selected.
 */
export interface CorrectionProviderOverrides {
  apiKey?: string | null;
  model?: string | null;
}

export interface GradeEssayParams {
  systemPrompt: string;
  userPrompt: string;
}

/** A provider credential (API key, or a required model with no default) is missing. */
export class CorrectionProviderNotConfiguredError extends Error {}
/** The provider's own rate limit was hit. */
export class CorrectionProviderRateLimitedError extends Error {}

/**
 * The provider responded with a non-2xx status. The constructor accepts only
 * the HTTP status -- never a message -- so a provider's own error text (which
 * could echo back part of the request) can never reach a log or a learner.
 */
export class CorrectionProviderRequestError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`Correction provider request failed (${status}).`);
    this.status = status;
  }
}

/**
 * The request never reached the provider or never received a response at
 * all (network failure, DNS failure, or a request timeout) -- there is no
 * HTTP status to report.
 */
export class CorrectionProviderTransportError extends Error {
  constructor() {
    super("Correction provider request could not be completed.");
  }
}

/**
 * The provider returned a 2xx response, but its content didn't even look
 * like an attempted JSON object/array (e.g. plain prose) -- the model most
 * likely doesn't honor (or wasn't given) the requested structured-output
 * format, as opposed to attempting JSON and getting it wrong. Distinguished
 * from CorrectionProviderInvalidJsonError so a log can tell "this model is
 * incompatible with structured output" apart from "this model attempted
 * JSON but produced something malformed."
 */
export class CorrectionProviderFormatUnsupportedError extends Error {
  constructor() {
    super("Correction provider did not return a structured JSON response.");
  }
}

/** The provider's content looked like an attempted JSON object/array, but failed to parse. */
export class CorrectionProviderInvalidJsonError extends Error {
  constructor() {
    super("Correction provider's response was not valid JSON.");
  }
}

/**
 * Cheap heuristic shared by every JSON-parsing adapter: does this content
 * even look like an attempted JSON object/array? Never inspects anything
 * beyond the first non-whitespace character, so it can't echo any of the
 * provider's actual content into a log or an error.
 */
export function looksLikeJson(content: string): boolean {
  const firstChar = content.trimStart().charAt(0);
  return firstChar === "{" || firstChar === "[";
}

/**
 * Throws CorrectionProviderFormatUnsupportedError when `content` doesn't
 * even look like an attempted JSON object/array, or CorrectionProviderInvalidJsonError
 * when it does but still fails to parse. Shared by every adapter that grades
 * by parsing a raw text response as JSON.
 */
export function parseCorrectionJson(content: string): unknown {
  if (!looksLikeJson(content)) {
    throw new CorrectionProviderFormatUnsupportedError();
  }
  try {
    return JSON.parse(content);
  } catch {
    throw new CorrectionProviderInvalidJsonError();
  }
}

export interface CorrectionProvider {
  readonly id: CorrectionProviderId;
  /** True when a server-side credential is available for a provider call. */
  hasConfiguredCredentials(overrides?: CorrectionProviderOverrides): boolean;
  /**
   * Grades an essay and returns the raw, still-untrusted provider response.
   * The caller validates the result against essayFeedbackSchema; a provider
   * response remains untrusted at the application boundary regardless of
   * any structured-output constraint the provider itself applied.
   */
  gradeEssay(params: GradeEssayParams, overrides?: CorrectionProviderOverrides): Promise<unknown>;
}
