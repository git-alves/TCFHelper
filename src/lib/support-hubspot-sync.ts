import "server-only";

import {
  associateHubspotDefault,
  findOrCreateHubspotAttachmentNote,
  findOrCreateHubspotTicket,
  uploadHubspotFile,
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
  hubspotAttachmentFileId: string | null;
  hubspotAttachmentSyncedAt: Date | null;
  attachment: { data: Uint8Array; originalName: string; mimeType: string } | null;
};

// Shared by every caller that loads a row to sync (the retry cron's batch
// query and the admin manual-retry route's single-row lookup), so the two
// never drift into fetching different fields for the same operation.
export const SYNCABLE_SUPPORT_REQUEST_SELECT = {
  id: true,
  senderEmail: true,
  category: true,
  details: true,
  hubspotTicketId: true,
  hubspotAttachmentFileId: true,
  hubspotAttachmentSyncedAt: true,
  user: { select: { name: true } },
  attachment: { select: { data: true, originalName: true, mimeType: true } },
} as const;

type SyncableSupportRequestRow = {
  id: string;
  senderEmail: string;
  category: SupportCategory;
  details: string;
  hubspotTicketId: string | null;
  hubspotAttachmentFileId: string | null;
  hubspotAttachmentSyncedAt: Date | null;
  user: { name: string | null };
  attachment: { data: Uint8Array; originalName: string; mimeType: string } | null;
};

export function toSyncableSupportRequest(row: SyncableSupportRequestRow): SyncableSupportRequest {
  return {
    id: row.id,
    senderEmail: row.senderEmail,
    senderName: row.user.name,
    category: row.category,
    details: row.details,
    hubspotTicketId: row.hubspotTicketId,
    hubspotAttachmentFileId: row.hubspotAttachmentFileId,
    hubspotAttachmentSyncedAt: row.hubspotAttachmentSyncedAt,
    attachment: row.attachment,
  };
}

// Mirrors one support request into HubSpot, resuming from whatever a
// previous attempt already got done. Duplicate-creation safety comes from
// two layers: the locally persisted ids below let a normal retry skip
// straight past work it already finished, and findOrCreateHubspotTicket /
// findOrCreateHubspotAttachmentNote are themselves safe to call again (or
// concurrently, e.g. the initial submit racing the retry cron) even if that
// local persistence never happened, because HubSpot enforces uniqueness on
// each object's support_request_id property server-side. Throws after
// recording the attempt/error on the row, so callers can decide for
// themselves whether the failure should affect their own response (the
// initial request route treats it as best-effort; the retry cron just logs
// and moves on to the next row).
export async function syncSupportRequestToHubspot(request: SyncableSupportRequest): Promise<void> {
  try {
    const contactId = await upsertHubspotContact({ email: request.senderEmail, name: request.senderName });

    let ticketId = request.hubspotTicketId;
    if (!ticketId) {
      ticketId = await findOrCreateHubspotTicket({
        supportRequestId: request.id,
        category: request.category,
        details: request.details,
        senderEmail: request.senderEmail,
      });
      await prisma.supportRequest.update({ where: { id: request.id }, data: { hubspotTicketId: ticketId } });
    }

    await associateHubspotDefault({ type: "tickets", id: ticketId }, { type: "contacts", id: contactId });

    if (request.attachment && !request.hubspotAttachmentSyncedAt) {
      let fileId = request.hubspotAttachmentFileId;
      if (!fileId) {
        fileId = await uploadHubspotFile({
          data: request.attachment.data,
          fileName: request.attachment.originalName,
          mimeType: request.attachment.mimeType,
        });
        await prisma.supportRequest.update({
          where: { id: request.id },
          data: { hubspotAttachmentFileId: fileId },
        });
      }

      const noteId = await findOrCreateHubspotAttachmentNote({
        supportRequestId: request.id,
        fileId,
        fileName: request.attachment.originalName,
      });
      await associateHubspotDefault({ type: "notes", id: noteId }, { type: "tickets", id: ticketId });
      await associateHubspotDefault({ type: "notes", id: noteId }, { type: "contacts", id: contactId });

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
