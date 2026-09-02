-- Admin-editable reference points for the settings-page consumption bar
-- (an approximate daily Gemini request count against an owner-set limit,
-- not an enforced quota). Nullable and additive: a null value falls back to
-- DEFAULT_GEMINI_DAILY_REQUEST_LIMIT (see src/lib/app-config.ts).
ALTER TABLE "AppConfig" ADD COLUMN "correctionDailyLimit" INTEGER;
ALTER TABLE "AppConfig" ADD COLUMN "exampleDailyLimit" INTEGER;
