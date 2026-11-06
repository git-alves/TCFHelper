import type { Metadata } from "next";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_DOCUMENTS } from "@/lib/legal-documents";

const legalDocument = LEGAL_DOCUMENTS.refund;

export const metadata: Metadata = {
  title: `${legalDocument.title} — MyTCFLab`,
  description: legalDocument.description,
};

export default function RefundPage() {
  return <LegalDocumentPage legalDocument={legalDocument} />;
}
