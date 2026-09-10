/**
 * A per-process, in-memory sliding-window limiter for `/api/spell-check`.
 *
 * The checker is local and has no billable upstream service, so a lightweight
 * per-instance guard is enough to prevent a runaway client from monopolizing
 * CPU without putting a database call on every debounced keystroke. A
 * multi-instance deployment applies this ceiling per instance.
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS_PER_WINDOW = 40;
const requestTimestampsByUserId = new Map<string, number[]>();

/** Records one request attempt and reports whether it should be rejected. */
export function isSpellCheckRateLimited(userId: string, now: number = Date.now()): boolean {
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

/** Test-only: clears recorded history so cases do not leak between tests. */
export function resetSpellCheckRateLimitForTests(): void {
  requestTimestampsByUserId.clear();
}
