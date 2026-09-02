-- Single fixed-id row letting the owner override the Gemini API key and
-- model used for correction and for example generation independently, from
-- the admin panel. Any null column falls back to the existing
-- GEMINI_API_KEY / GEMINI_MODEL / GEMINI_CORRECTION_MODEL env vars, so this
-- is purely additive: an existing deployment with no row here behaves
-- exactly as before.
CREATE TABLE "AppConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "correctionApiKey" TEXT,
    "correctionModel" TEXT,
    "exampleApiKey" TEXT,
    "exampleModel" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);
