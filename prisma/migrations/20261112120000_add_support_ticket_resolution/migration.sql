-- Support-ticket numbers and resolution.
--
-- Everything here is additive. The still-live previous deployment inserts
-- SupportRequest rows without knowing any of these columns, so each new
-- column is either nullable or has a permanent default that gives that old
-- insert a correct value:
--   * "status" defaults to 'OPEN' (what every request implicitly was);
--   * "ticketNumber" defaults to the next value of its sequence, so an insert
--     from either deployment gets the next sequential number.
--
-- The one data write is the ticketNumber backfill. It is limited to the new
-- column and is derived entirely from existing data (the request's position
-- in createdAt order, id as the tie-break, oldest = 1); no existing column of
-- any row is changed, so no row changes meaning. This is the same shape as
-- 20260811100000_add_access_code_expires_at, which also fills a newly added
-- denormalized column from existing columns.
--
-- The migration runs as a single transaction, and ALTER TABLE keeps the
-- table locked until it commits, so a concurrent insert waits and then takes
-- the first number after the backfilled ones; no row can slip in unnumbered
-- or be numbered twice.

CREATE TYPE "SupportRequestStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "SupportResolutionFeedback" AS ENUM ('WORKED', 'STILL_BROKEN');

ALTER TABLE "SupportRequest"
    ADD COLUMN "ticketNumber" INTEGER,
    ADD COLUMN "status" "SupportRequestStatus" NOT NULL DEFAULT 'OPEN',
    ADD COLUMN "resolvedAt" TIMESTAMP(3),
    ADD COLUMN "resolutionNote" TEXT,
    ADD COLUMN "noticeSeenAt" TIMESTAMP(3),
    ADD COLUMN "noticeDismissedAt" TIMESTAMP(3),
    ADD COLUMN "resolutionFeedback" "SupportResolutionFeedback",
    ADD COLUMN "feedbackAt" TIMESTAMP(3);

-- Same name and ownership Prisma gives an autoincrement column, so the schema
-- and the database stay in sync.
CREATE SEQUENCE "SupportRequest_ticketNumber_seq" OWNED BY "SupportRequest"."ticketNumber";

UPDATE "SupportRequest" AS request
SET "ticketNumber" = numbered.position
FROM (
    SELECT "id", row_number() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS position
    FROM "SupportRequest"
) AS numbered
WHERE request."id" = numbered."id";

-- The next insert continues after the backfilled numbers (1 when the table is
-- empty).
SELECT setval(
    '"SupportRequest_ticketNumber_seq"',
    COALESCE((SELECT max("ticketNumber") FROM "SupportRequest"), 0) + 1,
    false
);

ALTER TABLE "SupportRequest"
    ALTER COLUMN "ticketNumber" SET DEFAULT nextval('"SupportRequest_ticketNumber_seq"'),
    ALTER COLUMN "ticketNumber" SET NOT NULL;

CREATE UNIQUE INDEX "SupportRequest_ticketNumber_key" ON "SupportRequest"("ticketNumber");

-- The learner's pending-notice lookup (their oldest resolved ticket whose
-- notice is still undismissed) runs for every signed-in page load, so it must
-- stay cheap at any user count. A partial index holds only tickets with a
-- pending notice: resolved-and-undismissed rows, which is a tiny, shrinking
-- fraction of the table (an open, dismissed or reopened ticket is not in it).
-- Leading with "userId" and then the ordering columns lets the query read its
-- one row straight from the index, already in order. Prisma's schema language
-- cannot express a partial index, so this exists only in the migration and
-- is documented next to the model in schema.prisma.
CREATE INDEX "SupportRequest_pendingNotice_idx"
    ON "SupportRequest"("userId", "resolvedAt", "ticketNumber")
    WHERE "status" = 'RESOLVED' AND "noticeDismissedAt" IS NULL;
