/**
 * Only same-origin paths are safe to hand to router.push() from a
 * user-controlled query param. Resolving the candidate against a fixed base
 * with the WHATWG URL parser (rather than prefix-checking the raw string)
 * is what actually rejects absolute URLs, protocol-relative paths
 * ("//evil.example"), backslash variants ("/\evil.example"), and control
 * characters (e.g. "/\r\n//evil.example", which a naive prefix check
 * accepts but which browsers reinterpret as protocol-relative). We also
 * only ever return the parsed path/search/hash, never the raw candidate.
 */
const SAFE_REDIRECT_BASE = "http://localhost";

export function getSafeRedirectPath(
  candidate: string | null,
  fallback = "/dashboard"
): string {
  if (!candidate) return fallback;

  let url: URL;
  try {
    url = new URL(candidate, SAFE_REDIRECT_BASE);
  } catch {
    return fallback;
  }

  if (url.origin !== SAFE_REDIRECT_BASE) return fallback;

  const path = `${url.pathname}${url.search}${url.hash}`;
  return path || fallback;
}
