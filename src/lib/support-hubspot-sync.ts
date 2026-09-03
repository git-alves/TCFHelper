import "server-only";

import {
  associateHubspotDefault,
  attachHubspotFile,
  createHubspotTicket,
  upsertHubspotContact,
} from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";
import type { SupportCategory } from "@/lib/support-request";

// After this many failed attempts, the retry cron stops picking a row back
// up automatically. The row (and its last error) stays visible in
// /admin/support for manual follow-up instead of retrying forever against,
// say, a permanently misconfigured pipeline id.
export const MAX_HUBSPOT_SYNC_ATTEMPTS = 6;

export type SyncableSupportRequest = {
  id: string;
  senderEmail: string;
  senderName: string | null;
  category: SupportCategory;
  details: string;
  hubspotTicketId: string | null;
  hubspotAttachmentSyncedAt: Date | null;
  attachment: { data: Uint8Array; originalName: string; mimeType: string } | null;
};

// Mirrors one support request into HubSpot, resuming from whatever a
// previous attempt already got done rather than retrying from scratch --
// that's what keeps a retry from creating a duplicate ticket or a duplicate
// attachment note. Throws after recording the attempt/error on the row, so
// callers can decide for themselves whether the failure should affect their
// own response (the initial request route treats it as best-effort; the
// retry cron just logs and moves on to the next row).
export async function syncSupportRequestToHubspot(request: SyncableSupportRequest): Promise<void> {
  try {
    const contactId = await upsertHubspotContact({ email: request.senderEmail, name: request.senderName });

    let ticketId = request.hubspotTicketId;
    if (!ticketId) {
      ticketId = await createHubspotTicket({
        category: request.category,
        details: request.details,
        senderEmail: request.senderEmail,
      });
      // Persist immediately: once HubSpot has created this ticket, a later
      // failure in this same attempt must not cause a retry to create
      // another one.
      await prisma.supportRequest.update({ where: { id: request.id }, data: { hubspotTicketId: ticketId } });
    }

    await associateHubspotDefault({ type: "tickets", id: ticketId }, { type: "contacts", id: contactId });

    if (request.attachment && !request.hubspotAttachmentSyncedAt) {
      await attachHubspotFile({ ticketId, contactId, attachment: request.attachment });
      await prisma.supportRequest.update({
        where: { id: request.id },
        data: { hubspotAttachmentSyncedAt: new Date() },
      });
    }

    await prisma.supportRequest.update({
      where: { id: request.id },
      data: { hubspotSyncedAt: new Date(), hubspotLastSyncError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown HubSpot sync error";
    await prisma.supportRequest
      .update({
        where: { id: request.id },
        data: { hubspotSyncAttempts: { increment: 1 }, hubspotLastSyncError: message },
      })
      .catch(() => {
        console.error("Failed to record HubSpot sync failure state");
      });
    throw error;
  }
}
