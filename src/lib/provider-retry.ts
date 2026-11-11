// The single retry policy for an AI provider that answers HTTP 503 (the model
// is transiently overloaded). Shared by every provider call site -- Gemini
// correction, Gemini example generation and the OpenRouter client -- so the
// policy lives in one place.
//
// Policy: up to MAX_ATTEMPTS attempts in total (the first plus two retries),
// on HTTP 503 only, waiting about 2s and then about 5s (+/-20% jitter). A
// Retry-After header replaces the scheduled wait, capped at MAX_WAIT_MS. A
// retry is skipped, and the last 503 returned to the caller, when it could
// not finish inside the overall time budget. 429 and every other status are
// returned untouched, and a thrown error (transport failure, timeout)
// propagates immediately: the caller keeps deciding what those mean.

export const MAX_ATTEMPTS = 3;
const BASE_WAITS_MS = [2_000, 5_000] as const;
const JITTER_RATIO = 0.2;
// The longest a scheduled wait can be once jittered; also the cap on Retry-After.
export const MAX_WAIT_MS = Math.round(BASE_WAITS_MS[BASE_WAITS_MS.length - 1] * (1 + JITTER_RATIO));
// Headroom beyond MAX_ATTEMPTS full-length attempts: covers both waits at their
// longest (about 8.4s) and leaves the rest for persisting the result. With the
// correction call's 45s attempts this is a 150s budget, with the example
// call's 20s attempts, 75s.
export const OVERLOAD_RETRY_BUDGET_SLACK_MS = 15_000;

export interface OverloadRetryOptions {
  /** Names the call in the log line, e.g. "Gemini correction". */
  label: string;
  /** The timeout each attempt carries; a retry only starts if a full one still fits the budget. */
  attemptTimeoutMs: number;
  /** Overall budget measured from the first attempt. Defaults to MAX_ATTEMPTS attempts plus slack. */
  totalBudgetMs?: number;
  // Injectable so tests are deterministic.
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Retry-After as a wait in ms: either delta-seconds or an HTTP date. Undefined when absent or unusable. */
function parseRetryAfterMs(response: Response, now: number): number | undefined {
  const raw = response.headers?.get?.("retry-after")?.trim();
  if (!raw) return undefined;
  if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw) * 1_000);
  const date = Date.parse(raw);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

/**
 * Calls `send` and, while the response is a 503, retries per the policy above.
 * Resolves with the last response (still a 503 when every retry was used up or
 * skipped); never inspects or consumes a body.
 */
export async function sendWithOverloadRetry(
  send: () => Promise<Response>,
  options: OverloadRetryOptions,
): Promise<Response> {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? defaultSleep;
  const totalBudgetMs = options.totalBudgetMs ?? MAX_ATTEMPTS * options.attemptTimeoutMs + OVERLOAD_RETRY_BUDGET_SLACK_MS;
  const startedAt = now();

  let response = await send();
  for (let attempt = 1; response.status === 503 && attempt < MAX_ATTEMPTS; attempt++) {
    const retryAfterMs = parseRetryAfterMs(response, now());
    const scheduledMs = BASE_WAITS_MS[attempt - 1] * (1 + (random() * 2 - 1) * JITTER_RATIO);
    const waitMs = Math.round(retryAfterMs === undefined ? scheduledMs : Math.min(retryAfterMs, MAX_WAIT_MS));

    if (now() - startedAt + waitMs + options.attemptTimeoutMs > totalBudgetMs) {
      console.error(`${options.label} overloaded (503), not retrying (attempt ${attempt}): out of time budget`);
      break;
    }

    console.error(`${options.label} overloaded (503), retrying (attempt ${attempt}) in ${waitMs}ms`);
    await sleep(waitMs);
    response = await send();
  }
  return response;
}
