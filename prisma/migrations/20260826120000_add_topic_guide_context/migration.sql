-- Adds the writing-context profile used by the guided-writing feature (see
-- docs/guided-writing.md). Nullable and additive: existing rows and any
-- topic without a curated profile fall back to the client-side deterministic
-- classifier instead of this column.
CREATE TYPE "GuideProfile" AS ENUM (
    'INFORMAL_PERSONAL_MESSAGE',
    'FORMAL_PROFESSIONAL_MESSAGE',
    'PUBLIC_ARTICLE_OR_NOTE',
    'PUBLIC_LETTER',
    'ARGUMENTATIVE_ANALYSIS'
);

ALTER TABLE "Topic" ADD COLUMN "guideContext" "GuideProfile";
