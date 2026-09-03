-- Nullable and additive: existing rows simply have no HubSpot mirror yet,
-- and nothing reads these columns until the sync path starts writing them.
ALTER TABLE "SupportRequest"
  ADD COLUMN "hubspotTicketId" TEXT,
  ADD COLUMN "hubspotSyncedAt" TIMESTAMP(3);
