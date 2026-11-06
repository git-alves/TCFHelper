import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_BRAND, getLegalDocument } from "@/lib/legal-documents";
import { resolveLegalLocale, type LegalSearchParams } from "@/lib/legal-locale";

interface TermsPageProps {
  searchParams: Promise<LegalSearchParams>;
}

export async function generateMetadata({ searchParams }: TermsPageProps): Promise<Metadata> {
  const { locale } = await resolveLegalLocale(searchParams);
  const legalDocument = getLegalDocument("terms", locale);
  return {
    title: `${legalDocument.title} — ${LEGAL_BRAND}`,
    description: legalDocument.description,
  };
}

export default async function TermsPage({ searchParams }: TermsPageProps) {
  const { locale, pinned } = await resolveLegalLocale(searchParams);
  return <LegalDocumentPage slug="terms" locale={locale} pinned={pinned} />;
}
