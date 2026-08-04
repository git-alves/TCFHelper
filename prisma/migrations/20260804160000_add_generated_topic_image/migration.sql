-- Adds an optional, self-contained illustration to a Topic. Populated only
-- for AI_GENERATED Task 3 topics; every other topic keeps both columns null.
ALTER TABLE "Topic"
  ADD COLUMN "imageData" TEXT,
  ADD COLUMN "imageAlt" TEXT;
