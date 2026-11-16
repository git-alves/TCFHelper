-- Additive re-engagement-email foundation. Existing users remain opted in but
-- the singleton switch below defaults false, so no pre-existing learner can
-- receive mail until the owner explicitly enables it. Existing AppConfig rows
-- gain the same false value and all other additions are empty/new tables.
CREATE TYPE "InactivityEmailKind" AS ENUM ('SEVEN_DAY', 'THIRTY_DAY');
CREATE TYPE "InactivityEmailSendStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

ALTER TABLE "User" ADD COLUMN "inactivityEmailsUnsubscribedAt" TIMESTAMP(3);
ALTER TABLE "AppConfig" ADD COLUMN "inactivityEmailsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "InactivityEmailTemplate" (
  "id" TEXT NOT NULL,
  "kind" "InactivityEmailKind" NOT NULL,
  "locale" "Locale" NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InactivityEmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InactivityEmailSend" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "InactivityEmailKind" NOT NULL,
  "lastActiveAt" TIMESTAMP(3) NOT NULL,
  "status" "InactivityEmailSendStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "resendMessageId" TEXT,
  "sentAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InactivityEmailSend_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InactivityEmailSend_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InactivityEmailTemplate_kind_locale_key" ON "InactivityEmailTemplate"("kind", "locale");
CREATE UNIQUE INDEX "InactivityEmailSend_userId_kind_lastActiveAt_key" ON "InactivityEmailSend"("userId", "kind", "lastActiveAt");
CREATE INDEX "InactivityEmailSend_status_createdAt_idx" ON "InactivityEmailSend"("status", "createdAt");
CREATE INDEX "InactivityEmailSend_userId_kind_sentAt_idx" ON "InactivityEmailSend"("userId", "kind", "sentAt");
