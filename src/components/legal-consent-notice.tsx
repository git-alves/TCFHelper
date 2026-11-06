"use client";

import Link from "next/link";
import { useAppLocale } from "@/components/app-locale-provider";
import { LEGAL_LINK_COPY } from "@/lib/legal-link-copy";

const LINK_CLASSES =
  "font-medium text-zinc-900 underline underline-offset-2 hover:text-violet-700 dark:text-zinc-100 dark:hover:text-violet-300";

/** "By continuing, you agree to our Terms of Service, Privacy Policy, and Refund Policy." */
export function LegalConsentNotice({ className = "" }: { className?: string }) {
  const { locale } = useAppLocale();
  const { titles, consent } = LEGAL_LINK_COPY[locale];
  return (
    <p className={`text-center text-xs leading-5 text-zinc-600 dark:text-zinc-400 ${className}`}>
      {consent.lead}
      <Link href="/terms" className={LINK_CLASSES}>
        {titles.terms}
      </Link>
      {consent.sep1}
      <Link href="/privacy" className={LINK_CLASSES}>
        {titles.privacy}
      </Link>
      {consent.sep2}
      <Link href="/refund" className={LINK_CLASSES}>
        {titles.refund}
      </Link>
      {consent.end}
    </p>
  );
}
