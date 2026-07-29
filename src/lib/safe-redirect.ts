/**
 * Only same-origin relative paths are safe to hand to router.push() from a
 * user-controlled query param. Rejects absolute URLs and protocol-relative
 * paths ("//evil.example") that browsers treat as a different origin.
 */
export function getSafeRedirectPath(
  candidate: string | null,
  fallback = "/dashboard"
): string {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.startsWith("/\\")
  ) {
    return fallback;
  }
  return candidate;
}
