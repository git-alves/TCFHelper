-- A standalone learner-owned support ledger. It neither changes existing
-- records nor exposes uploaded evidence publicly, so it is safe to apply
-- while the previous application version remains live.
CREATE TYPE "SupportRequestCategory" AS ENUM (
  'BUG',
  'QUESTION',
  'FEATURE_REQUEST_FEEDBACK',
  'ACCOUNT_ACCESS',
  'OTHER'
);

CREATE TABLE "SupportRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  "category" "SupportRequestCategory" NOT NULL,
  "details" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportAttachment" (
  "id" TEXT NOT NULL,
  "supportRequestId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SupportAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SupportAttachment_supportRequestId_key" ON "SupportAttachment"("supportRequestId");
CREATE INDEX "SupportRequest_createdAt_id_idx" ON "SupportRequest"("createdAt", "id");
CREATE INDEX "SupportRequest_userId_createdAt_idx" ON "SupportRequest"("userId", "createdAt");
CREATE INDEX "SupportRequest_category_createdAt_idx" ON "SupportRequest"("category", "createdAt");

ALTER TABLE "SupportRequest"
  ADD CONSTRAINT "SupportRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportAttachment"
  ADD CONSTRAINT "SupportAttachment_supportRequestId_fkey"
  FOREIGN KEY ("supportRequestId") REFERENCES "SupportRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportAttachment"
  ADD CONSTRAINT "SupportAttachment_byteSize_positive"
  CHECK ("byteSize" > 0);
