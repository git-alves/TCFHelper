// Shared between server code (admin-access-codes.ts, the admin API route)
// and the client generator form -- no "server-only" import, unlike its
// neighbors in this directory, so a client component can read these without
// pulling in Prisma.

export const ADMIN_ACCESS_CODES_PAGE_SIZE = 50;

// The confirmed product scope for a batch, not derived from anything else.
// It also happens to sit well inside ADMIN_ACCESS_CODES_PAGE_SIZE, so a
// whole batch is always among the most-recent rows listAccessCodes returns
// -- but that recoverability property is a side effect here, not the reason
// for the number.
export const MAX_ACCESS_CODE_BATCH_SIZE = 10;

// A DB CHECK constraint enforces this too (see the access-code-validity
// migration). This export is the single source of truth the API/UI validate
// against, not a second independent number that could drift from the DB's
// own bound.
export const MAX_VALIDITY_DAYS = 3650;

/**
 * Parses a `<input type="number">` string into a strictly positive integer
 * no greater than `max`, or null if it isn't one. Number(), not parseInt():
 * parseInt stops at the first non-digit character and silently truncates
 * "1e1" to 1 and "30.5" to 30 instead of correctly reading 10 or rejecting a
 * non-integer -- both are strings a number input can legitimately hold.
 */
export function parsePositiveIntegerFormValue(value: string, max: number): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) return null;
  return parsed;
}
