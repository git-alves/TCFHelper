import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import {
  AdminEventLogQueryError,
  adminEventLogSearchParamsFromUrl,
  getAdminEventLogPage,
  parseAdminEventLogQuery,
} from "@/lib/admin-event-log";

/** Private JSON counterpart of the owner-only operational-log page. */
export async function GET(request: Request) {
  const admin = await getAdminApiUser({ skipPresenceTouch: true });
  if (!admin) return adminNotFoundResponse();

  try {
    const now = new Date();
    const url = new URL(request.url);
    const query = parseAdminEventLogQuery(adminEventLogSearchParamsFromUrl(url.searchParams), now);
    return adminJsonResponse(await getAdminEventLogPage(query, now));
  } catch (error) {
    if (error instanceof AdminEventLogQueryError) {
      return adminJsonResponse({ error: "Invalid log query." }, 400);
    }
    throw error;
  }
}
