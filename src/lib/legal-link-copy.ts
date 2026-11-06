import type { AppLocale } from "@/lib/app-locale";

// The small slice of legal copy that client components need (the sign-in
// agreement line and the landing footer links). Kept apart from the long
// document bodies in legal-content/ so those never ship in a client bundle.

export type LegalDocumentSlug = "terms" | "privacy" | "refund";

// Order matches the agreement line ("Terms of Service, Privacy Policy, and
// Refund Policy") and every footer that lists the documents.
export const LEGAL_DOCUMENT_SLUGS: readonly LegalDocumentSlug[] = ["terms", "privacy", "refund"];

export interface LegalLinkCopy {
  titles: Record<LegalDocumentSlug, string>;
  /**
   * The agreement line split around the three links, so each language can use
   * its own articles and punctuation:
   * lead + Terms + sep1 + Privacy + sep2 + Refund + end.
   */
  consent: { lead: string; sep1: string; sep2: string; end: string };
}

export const LEGAL_LINK_COPY: Record<AppLocale, LegalLinkCopy> = {
  en: {
    titles: { terms: "Terms of Service", privacy: "Privacy Policy", refund: "Refund Policy" },
    consent: { lead: "By continuing, you agree to our ", sep1: ", ", sep2: ", and ", end: "." },
  },
  fr: {
    titles: { terms: "Conditions d’utilisation", privacy: "Politique de confidentialité", refund: "Politique de remboursement" },
    consent: { lead: "En continuant, vous acceptez nos ", sep1: ", notre ", sep2: " et notre ", end: "." },
  },
  es: {
    titles: { terms: "Términos del servicio", privacy: "Política de privacidad", refund: "Política de reembolso" },
    consent: { lead: "Al continuar, aceptas nuestros ", sep1: ", nuestra ", sep2: " y nuestra ", end: "." },
  },
  pt: {
    titles: { terms: "Termos de Serviço", privacy: "Política de Privacidade", refund: "Política de Reembolso" },
    consent: { lead: "Ao continuar, você concorda com os nossos ", sep1: ", a nossa ", sep2: " e a nossa ", end: "." },
  },
};
