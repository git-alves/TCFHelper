import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { isHubspotConfigured } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";
import { SYNCABLE_SUPPORT_REQUEST_SELECT, syncSupportRequestToHubspot, toSyncableSupportRequest } from "@/lib/support-hubspot-sync";

/**
 * Manually re-attempts one request's HubSpot mirror, bypassing the retry
 * cron's MAX_HUBSPOT_SYNC_ATTEMPTS cutoff -- the only way to unstick a
 * request left behind by a prolonged outage without a database change.
 * syncSupportRequestToHubspot's own dedupe (both the locally persisted ids
 * and HubSpot's server-side uniqueness on support_request_id) makes this
 * safe to call even while the cron might independently be retrying the same
 * row.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  if (!isHubspotConfigured()) {
    return adminJsonResponse({ error: "HubSpot is not configured." }, 409);
  }

  const { requestId } = await params;
  const supportRequest = await prisma.supportRequest.findUnique({
    where: { id: requestId },
    select: { hubspotSyncedAt: true, ...SYNCABLE_SUPPORT_REQUEST_SELECT },
  });
  if (!supportRequest) return adminNotFoundResponse();
  if (supportRequest.hubspotSyncedAt) {
    return adminJsonResponse({ error: "This request has already synced to HubSpot." }, 409);
  }

  try {
    await syncSupportRequestToHubspot(toSyncableSupportRequest(supportRequest));
  } catch (error) {
    return adminJsonResponse(
      { error: error instanceof Error ? error.message : "HubSpot sync failed." },
      502,
    );
  }

  return adminJsonResponse({ synced: true });
}
