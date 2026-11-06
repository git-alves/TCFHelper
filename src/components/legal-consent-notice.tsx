import Link from "next/link";
import { LEGAL_DOCUMENT_LIST } from "@/lib/legal-documents";

const LINK_CLASSES =
  "font-medium text-zinc-900 underline underline-offset-2 hover:text-violet-700 dark:text-zinc-100 dark:hover:text-violet-300";

/** "By continuing, you agree to our Terms of Service, Privacy Policy, and Refund Policy." */
export function LegalConsentNotice({ className = "" }: { className?: string }) {
  const [terms, privacy, refund] = LEGAL_DOCUMENT_LIST;
  return (
    <p className={`text-center text-xs leading-5 text-zinc-600 dark:text-zinc-400 ${className}`}>
      By continuing, you agree to our{" "}
      <Link href={terms.path} className={LINK_CLASSES}>
        {terms.title}
      </Link>
      ,{" "}
      <Link href={privacy.path} className={LINK_CLASSES}>
        {privacy.title}
      </Link>
      , and{" "}
      <Link href={refund.path} className={LINK_CLASSES}>
        {refund.title}
      </Link>
      .
    </p>
  );
}
