-- Nullable and additive: existing rows simply have no HubSpot mirror yet,
-- and nothing reads these columns until the sync path starts writing them.
ALTER TABLE "SupportRequest"
  ADD COLUMN "hubspotTicketId" TEXT,
  ADD COLUMN "hubspotAttachmentFileId" TEXT,
  ADD COLUMN "hubspotAttachmentSyncedAt" TIMESTAMP(3),
  ADD COLUMN "hubspotSyncedAt" TIMESTAMP(3),
  ADD COLUMN "hubspotSyncAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "hubspotLastSyncError" TEXT;

CREATE INDEX "SupportRequest_hubspotSyncedAt_hubspotSyncAttempts_idx"
  ON "SupportRequest"("hubspotSyncedAt", "hubspotSyncAttempts");
