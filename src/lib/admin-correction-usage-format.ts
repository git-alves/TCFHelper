// Display of a learner's correction usage in the admin area. Client-safe (no
// server imports) so the users table and detail page share one wording.

function count(value: number) {
  return value.toLocaleString("en-US");
}

/** " (3 failed)" for a failure count above zero, and nothing at all for zero. */
export function failedSuffix(failed: number) {
  return failed > 0 ? ` (${count(failed)} failed)` : "";
}

/**
 * "2 today (1 failed) · 9 this month (3 failed)". "today" and "this month" are
 * corrections the learner received; a correction that failed on the AI
 * provider's side was refunded and is counted only in the failed figure.
 */
export function formatCorrectionUsage(corrections: {
  currentDayRequests: number;
  currentMonthRequests: number;
  currentDayFailed: number;
  currentMonthFailed: number;
}) {
  return (
    `${count(corrections.currentDayRequests)} today${failedSuffix(corrections.currentDayFailed)} · ` +
    `${count(corrections.currentMonthRequests)} this month${failedSuffix(corrections.currentMonthFailed)}`
  );
}
