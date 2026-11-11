import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import {
  AdminEventLogQueryError,
  AdminEventLogSearchTooBroadError,
  MAX_ADMIN_LOG_EXPORT_ROWS,
  adminEventLogSearchParamsFromUrl,
  getAdminEventLogForExport,
  parseAdminEventLogQuery,
} from "@/lib/admin-event-log";
import { adminEventLogExportFilename, formatAdminEventLogTxt } from "@/lib/admin-event-log-export";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

/**
 * Plain-text counterpart of the owner-only operational-log page: every event
 * the current filters select, across all pages, newest first. Parsed by the
 * page's own parser, so it accepts and rejects exactly what the page does
 * (page and limit are accepted and ignored). Like the CSV exports it is not
 * itself recorded as an admin action.
 */
export async function GET(request: Request) {
  const admin = await getAdminApiUser({ skipPresenceTouch: true });
  if (!admin) return adminNotFoundResponse();

  try {
    const now = new Date();
    const query = parseAdminEventLogQuery(adminEventLogSearchParamsFromUrl(new URL(request.url).searchParams), now);
    const result = await getAdminEventLogForExport(query, now);

    // Never emit a file that silently omits events past the cap -- a log that
    // looks complete but is missing entries is worse than an explicit refusal.
    if (result.truncated) {
      return adminJsonResponse(
        {
          error: `More than ${MAX_ADMIN_LOG_EXPORT_ROWS.toLocaleString("en-US")} events match, the export limit. Narrow the date range or filters before exporting.`,
        },
        413,
      );
    }

    const text = formatAdminEventLogTxt({
      events: result.events,
      filters: query,
      generatedAt: now,
      retentionCutoff: result.retentionCutoff,
    });
    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${adminEventLogExportFilename(now)}"`,
        ...NO_STORE_HEADERS,
      },
    });
  } catch (error) {
    if (error instanceof AdminEventLogSearchTooBroadError) {
      return adminJsonResponse({ error: "Search is too broad. Use a more specific email or identifier." }, 422);
    }
    if (error instanceof AdminEventLogQueryError) {
      return adminJsonResponse({ error: "Invalid log query." }, 400);
    }
    throw error;
  }
}
