import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_BRAND, getLegalDocument } from "@/lib/legal-documents";
import { resolveLegalLocale, type LegalSearchParams } from "@/lib/legal-locale";

interface PrivacyPageProps {
  searchParams: Promise<LegalSearchParams>;
}

export async function generateMetadata({ searchParams }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await resolveLegalLocale(searchParams);
  const legalDocument = getLegalDocument("privacy", locale);
  return {
    title: `${legalDocument.title} — ${LEGAL_BRAND}`,
    description: legalDocument.description,
  };
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const { locale, pinned } = await resolveLegalLocale(searchParams);
  return <LegalDocumentPage slug="privacy" locale={locale} pinned={pinned} />;
}
