import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

const legalDocument = LEGAL_DOCUMENTS.privacy;

export const metadata: Metadata = {
  title: `${legalDocument.title} — MyTCFLab`,
  description: legalDocument.description,
};

export default function PrivacyPage() {
  return <LegalDocumentPage legalDocument={legalDocument} />;
}
