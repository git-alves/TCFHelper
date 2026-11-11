// Directive-free and dependency-free, so both the server-side query
// (support-resolution.ts, which imports prisma) and the admin page's status
// helper can share one definition of "still pending".

/** How long a resolution notice stays pending after the ticket was resolved. */
export const SUPPORT_NOTICE_EXPIRY_DAYS = 7;
const SUPPORT_NOTICE_EXPIRY_MS = SUPPORT_NOTICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/** The oldest resolvedAt a notice can have and still be pending at `now`. */
export function supportNoticeExpiryCutoff(now: Date) {
  return new Date(now.getTime() - SUPPORT_NOTICE_EXPIRY_MS);
}
