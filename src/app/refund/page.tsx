import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_BRAND, getLegalDocument } from "@/lib/legal-documents";
import { resolveLegalLocale, type LegalSearchParams } from "@/lib/legal-locale";

interface RefundPageProps {
  searchParams: Promise<LegalSearchParams>;
}

export async function generateMetadata({ searchParams }: RefundPageProps): Promise<Metadata> {
  const { locale } = await resolveLegalLocale(searchParams);
  const legalDocument = getLegalDocument("refund", locale);
  return {
    title: `${legalDocument.title} — ${LEGAL_BRAND}`,
    description: legalDocument.description,
  };
}

export default async function RefundPage({ searchParams }: RefundPageProps) {
  const { locale, pinned } = await resolveLegalLocale(searchParams);
  return <LegalDocumentPage slug="refund" locale={locale} pinned={pinned} />;
}
