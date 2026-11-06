import type { LegalDocumentSlug } from "@/lib/legal-link-copy";

export type { LegalDocumentSlug };

// Shared types and constants for the legal documents. Split from
// legal-documents.ts so the per-locale content files can import them without
// a circular dependency on the file that imports the content.

export const LEGAL_BRAND = "MyTCFLab";
export const LEGAL_SUPPORT_EMAIL = "support@mytcflab.com";

// ISO date, formatted per locale at render time. Bump this whenever any
// document's wording changes in a way that affects users (in every language
// at once), so each page's effective date stays truthful.
export const LEGAL_EFFECTIVE_DATE_ISO = "2026-11-06";

export const LEGAL_DOCUMENT_PATHS: Record<LegalDocumentSlug, `/${LegalDocumentSlug}`> = {
  terms: "/terms",
  privacy: "/privacy",
  refund: "/refund",
};

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocumentContent {
  description: string;
  sections: LegalSection[];
}

export interface LegalUiStrings {
  /** Includes its trailing colon, since French spaces it differently. */
  effectiveDate: string;
  backToHome: string;
  legalNavLabel: string;
  languageLabel: string;
  /** Shown on translated pages only; English is the controlling version. */
  translationNotice: { text: string; linkLabel: string } | null;
}

export interface LegalLocaleContent {
  ui: LegalUiStrings;
  documents: Record<LegalDocumentSlug, LegalDocumentContent>;
}
