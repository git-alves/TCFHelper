-- One row per admin-editable correction prompt block (see
-- src/lib/prompt-overrides.ts). A missing row for a given key falls back to
-- that block's built-in default, so this is purely additive: an existing
-- deployment with no rows here behaves exactly as before.
CREATE TABLE "PromptOverride" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptOverride_pkey" PRIMARY KEY ("key")
);
