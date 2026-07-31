-- Preserve a distinct trusted source for prompts fetched from the authorised
-- recent-exam feed. Existing topic rows deliberately remain unmodified.
ALTER TYPE "TopicSource" ADD VALUE 'RECENT_EXAM' AFTER 'OFFICIAL_EXAM';

ALTER TABLE "Topic"
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "externalRef" TEXT;

CREATE UNIQUE INDEX "Topic_externalRef_key" ON "Topic"("externalRef");
