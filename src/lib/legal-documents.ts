// Accessors for the public legal pages (/terms, /privacy, /refund). The
// documents exist in every app locale; English is the controlling version and
// the translations say so (see LegalUiStrings.translationNotice).

import { APP_LOCALE_INTL_TAGS, type AppLocale } from "@/lib/app-locale";
import { LEGAL_CONTENT_EN } from "@/lib/legal-content/en";
import { LEGAL_CONTENT_ES } from "@/lib/legal-content/es";
import { LEGAL_CONTENT_FR } from "@/lib/legal-content/fr";
import { LEGAL_CONTENT_PT } from "@/lib/legal-content/pt";
import {
  LEGAL_DOCUMENT_PATHS,
  LEGAL_EFFECTIVE_DATE_ISO,
  type LegalDocumentContent,
  type LegalLocaleContent,
} from "@/lib/legal-constants";
import { LEGAL_DOCUMENT_SLUGS, LEGAL_LINK_COPY, type LegalDocumentSlug } from "@/lib/legal-link-copy";

export { LEGAL_BRAND, LEGAL_DOCUMENT_PATHS, LEGAL_SUPPORT_EMAIL } from "@/lib/legal-constants";
export { LEGAL_DOCUMENT_SLUGS } from "@/lib/legal-link-copy";
export type { LegalDocumentSlug } from "@/lib/legal-link-copy";

const LEGAL_CONTENT: Record<AppLocale, LegalLocaleContent> = {
  en: LEGAL_CONTENT_EN,
  fr: LEGAL_CONTENT_FR,
  es: LEGAL_CONTENT_ES,
  pt: LEGAL_CONTENT_PT,
};

export interface LegalDocument extends LegalDocumentContent {
  slug: LegalDocumentSlug;
  path: `/${LegalDocumentSlug}`;
  title: string;
}

export function getLegalUi(locale: AppLocale) {
  return LEGAL_CONTENT[locale].ui;
}

export function getLegalDocument(slug: LegalDocumentSlug, locale: AppLocale): LegalDocument {
  return {
    slug,
    path: LEGAL_DOCUMENT_PATHS[slug],
    title: LEGAL_LINK_COPY[locale].titles[slug],
    ...LEGAL_CONTENT[locale].documents[slug],
  };
}

export function getLegalDocumentList(locale: AppLocale): LegalDocument[] {
  return LEGAL_DOCUMENT_SLUGS.map((slug) => getLegalDocument(slug, locale));
}

// Pinned to UTC: the stored value is a calendar date, so formatting it in the
// server's (or any reader's) time zone could display the previous day.
export function formatLegalEffectiveDate(locale: AppLocale): string {
  return new Intl.DateTimeFormat(APP_LOCALE_INTL_TAGS[locale], {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${LEGAL_EFFECTIVE_DATE_ISO}T00:00:00Z`));
}
