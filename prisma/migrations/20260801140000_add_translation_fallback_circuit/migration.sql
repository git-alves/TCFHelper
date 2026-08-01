-- A single fixed-id row tracks consecutive unofficial-scraper failures across
-- every server instance, so the fallback can be paused project-wide (not
-- per-user) once it looks broken, rather than every learner retrying it.
CREATE TABLE "TranslationFallbackCircuit" (
    "id" TEXT NOT NULL,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "openUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationFallbackCircuit_pkey" PRIMARY KEY ("id")
);
