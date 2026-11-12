// A small sliding-window limiter for the admin Test button, so it cannot be
// used as a free proxy to a paid model. It lives in the memory of one server
// instance (the call persists nothing, so there is no table to count in): with
// several warm instances the ceiling is the limit times the number of
// instances. Only the owner account can reach the route at all.

export const API_KEY_TEST_LIMIT = 10;
export const API_KEY_TEST_WINDOW_MS = 60_000;

const attempts = new Map<string, number[]>();

export function checkApiKeyTestRate(adminId: string, now = Date.now()): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const recent = (attempts.get(adminId) ?? []).filter((at) => now - at < API_KEY_TEST_WINDOW_MS);
  if (recent.length >= API_KEY_TEST_LIMIT) {
    attempts.set(adminId, recent);
    const retryAfterMs = API_KEY_TEST_WINDOW_MS - (now - recent[0]);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
  recent.push(now);
  attempts.set(adminId, recent);
  return { allowed: true };
}

/** For tests only. */
export function resetApiKeyTestRate() {
  attempts.clear();
}
