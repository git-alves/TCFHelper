-- Additive Clerk identity mapping. Nullable so existing learners can be
-- imported one at a time (see scripts/import-users-to-clerk.ts); every
-- existing foreign key keeps pointing at User.id, not this column.
ALTER TABLE "User" ADD COLUMN "clerkUserId" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

CREATE UNIQUE INDEX "User_clerkUserId_key" ON "User"("clerkUserId");

CREATE TABLE "ClerkWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClerkWebhookEvent_pkey" PRIMARY KEY ("id")
);
