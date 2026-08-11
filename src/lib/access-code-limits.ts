// Shared between server code (admin-access-codes.ts, the admin API route)
// and the client generator form -- no "server-only" import, unlike its
// neighbors in this directory, so a client component can read these without
// pulling in Prisma.

export const ADMIN_ACCESS_CODES_PAGE_SIZE = 50;

// Capped at the list page size (not some larger round number) so a whole
// batch is always among the most-recent rows listAccessCodes returns --
// otherwise the tail of a big batch would only ever exist in the transient
// client response and be unrecoverable after a reload.
export const MAX_ACCESS_CODE_BATCH_SIZE = ADMIN_ACCESS_CODES_PAGE_SIZE;

// A DB CHECK constraint enforces this too (see the access-code-validity
// migration). This export is the single source of truth the API/UI validate
// against, not a second independent number that could drift from the DB's
// own bound.
export const MAX_VALIDITY_DAYS = 3650;
