// Shared between the presence heartbeat writer (app-user.ts), the reader
// (admin-overview.ts), and the client tile that displays the threshold as
// user-facing text -- no "server-only" import, unlike its writer/reader.

// Bounds how often a heartbeat write happens for one account, regardless of
// how many requests they make -- see touchLastActive in app-user.ts.
export const ACTIVITY_HEARTBEAT_THROTTLE_MS = 60_000;

// "Online" is a heartbeat threshold, not literal real-time presence: there
// is no push channel or background job. Kept wider than
// ACTIVITY_HEARTBEAT_THROTTLE_MS -- otherwise an actively-used account could
// still read as offline in the gap between two heartbeat writes.
export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;
