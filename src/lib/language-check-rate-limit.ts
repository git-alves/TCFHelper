/**
 * A per-process, in-memory sliding-window limiter for `/api/language-check`.
 *
 * Unlike the DB-backed quotas elsewhere in this app (e.g. translation
 * quotas), a grammar check has no cross-device state worth persisting, and
 * this endpoint is called on nearly every debounced keystroke -- adding a
 * database round trip to each call would defeat the point of debouncing.
 * A fixed ceiling per server process is enough to blunt a runaway or
 * malicious client without that cost.
 *
 * Trade-off: this does not share state across server instances, so a
 * multi-instance deployment gets this limit per instance, not globally.
 * That is an acceptable ceiling for an abuse guard on a self-hosted,
 * non-billed backend; a durable, cross-instance limit would need Redis or
 * the same Postgres-advisory-lock pattern used for quotas.
 */

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS_PER_WINDOW = 40;

const requestTimestampsByUserId = new Map<string, number[]>();

/** Records one request attempt and reports whether it should be rejected. */
export function isLanguageCheckRateLimited(userId: string, now: number = Date.now()): boolean {
  const recentTimestamps = (requestTimestampsByUserId.get(userId) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS_PER_WINDOW) {
    requestTimestampsByUserId.set(userId, recentTimestamps);
    return true;
  }

  recentTimestamps.push(now);
  requestTimestampsByUserId.set(userId, recentTimestamps);
  return false;
}

/** Test-only: clears recorded history so cases don't leak into each other. */
export function resetLanguageCheckRateLimitForTests(): void {
  requestTimestampsByUserId.clear();
}
