// The external fallback deliberately links to the exact trusted recent-exam
// source that the learner selected. It does not fetch, copy, or transform
// Réussir content (see docs/reussir-correction-fallback.md).

export type ExampleFallbackErrorKind =
  | "dailyLimit"
  | "rateLimited"
  | "unavailable"
  | "generic";

const REUSSIR_ORIGIN = "https://reussir-tcfcanada.com";
const RECENT_EXAM_PATH = /^\/[a-z]+-\d{4}-expression-ecrite\/$/u;

/**
 * Returns a learner-facing source URL only after an actual example-generator
 * failure. Local quota/cooldown/rate-limit responses are intentional product
 * limits, not upstream failures, and must not expose the fallback.
 */
export function getReussirExampleFallbackUrl(
  exampleError: ExampleFallbackErrorKind | null,
  sourceUrl: string | null | undefined,
): string | null {
  if ((exampleError !== "unavailable" && exampleError !== "generic") || !sourceUrl) {
    return null;
  }

  try {
    const url = new URL(sourceUrl);
    if (url.origin !== REUSSIR_ORIGIN || !RECENT_EXAM_PATH.test(url.pathname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
