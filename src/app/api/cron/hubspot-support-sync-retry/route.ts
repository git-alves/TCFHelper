import { NextRequest, NextResponse } from "next/server";
import { isHubspotConfigured } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";
import { MAX_HUBSPOT_SYNC_ATTEMPTS, syncSupportRequestToHubspot } from "@/lib/support-hubspot-sync";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
// Bounds each run to a fixed number of HubSpot API round trips regardless of
// backlog size; anything left over is picked up on the next scheduled run.
const MAX_REQUESTS_PER_RUN = 25;

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Re-attempts support requests whose HubSpot mirror didn't complete on the
 * first try (HubSpot outage, rate limit, or a since-fixed misconfiguration).
 * Vercel invokes this daily in UTC and supplies CRON_SECRET as a bearer
 * token, the same credential used by the admin-event retention cron.
 * syncSupportRequestToHubspot resumes from whatever a prior attempt already
 * persisted (ticket id, uploaded file id), and the HubSpot-side creates it
 * still has to make are themselves deduped by a unique support_request_id
 * property -- so re-running it here, even concurrently with the initial
 * synchronous submit, never creates a duplicate ticket or attachment note.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  if (!isHubspotConfigured()) {
    return NextResponse.json({ skipped: "HubSpot is not configured" }, { headers: NO_STORE_HEADERS });
  }

  const pending = await prisma.supportRequest.findMany({
    where: { hubspotSyncedAt: null, hubspotSyncAttempts: { lt: MAX_HUBSPOT_SYNC_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: MAX_REQUESTS_PER_RUN,
    select: {
      id: true,
      senderEmail: true,
      category: true,
      details: true,
      hubspotTicketId: true,
      hubspotAttachmentFileId: true,
      hubspotAttachmentSyncedAt: true,
      user: { select: { name: true } },
      attachment: { select: { data: true, originalName: true, mimeType: true } },
    },
  });

  let succeeded = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      await syncSupportRequestToHubspot({
        id: item.id,
        senderEmail: item.senderEmail,
        senderName: item.user.name,
        category: item.category,
        details: item.details,
        hubspotTicketId: item.hubspotTicketId,
        hubspotAttachmentFileId: item.hubspotAttachmentFileId,
        hubspotAttachmentSyncedAt: item.hubspotAttachmentSyncedAt,
        attachment: item.attachment
          ? {
              data: item.attachment.data,
              originalName: item.attachment.originalName,
              mimeType: item.attachment.mimeType,
            }
          : null,
      });
      succeeded += 1;
    } catch (error) {
      failed += 1;
      // Support requests can contain sensitive free-form text; the error
      // message from the HubSpot client is a fixed, non-sensitive string
      // (e.g. an HTTP status), never request content.
      console.error("HubSpot support sync retry failed", error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ attempted: pending.length, succeeded, failed }, { headers: NO_STORE_HEADERS });
}
