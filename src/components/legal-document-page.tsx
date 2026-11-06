import Link from "next/link";
import { APP_LOCALES, APP_LOCALE_LABELS, DEFAULT_APP_LOCALE, type AppLocale } from "@/lib/app-locale";
import {
  LEGAL_BRAND,
  formatLegalEffectiveDate,
  getLegalDocument,
  getLegalDocumentList,
  getLegalUi,
  type LegalDocumentSlug,
} from "@/lib/legal-documents";

interface LegalDocumentPageProps {
  slug: LegalDocumentSlug;
  locale: AppLocale;
  /** True when the language was chosen with ?lang=, so links should carry it forward. */
  pinned?: boolean;
}

const LINK_CLASSES =
  "text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100";

/** Shared layout for the public Terms, Privacy, and Refund pages. */
export function LegalDocumentPage({ slug, locale, pinned = false }: LegalDocumentPageProps) {
  const legalDocument = getLegalDocument(slug, locale);
  const ui = getLegalUi(locale);
  const otherDocuments = getLegalDocumentList(locale).filter((other) => other.slug !== slug);
  const carry = (path: string) => (pinned ? `${path}?lang=${locale}` : path);

  return (
    // `lang` marks the document text for screen readers and hyphenation even
    // when ?lang= differs from the surrounding app chrome.
    <main
      lang={locale}
      className="flex-1 bg-gradient-to-b from-violet-100/70 via-violet-50/30 to-transparent px-4 py-12 sm:px-6 sm:py-16 dark:from-violet-950/40 dark:via-transparent"
    >
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900 hover:text-violet-700 dark:text-zinc-100 dark:hover:text-violet-300"
        >
          {LEGAL_BRAND}
        </Link>
        <h1 className="mt-5 text-4xl font-bold tracking-tight">{legalDocument.title}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {ui.effectiveDate} {formatLegalEffectiveDate(locale)}
        </p>

        <nav aria-label={ui.languageLabel.replace(/[:\u00a0]+$/, "")} className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{ui.languageLabel}</span>
          {APP_LOCALES.map((option) =>
            option === locale ? (
              <span key={option} lang={option} aria-current="true" className="font-semibold">
                {APP_LOCALE_LABELS[option]}
              </span>
            ) : (
              <Link
                key={option}
                href={`${legalDocument.path}?lang=${option}`}
                hrefLang={option}
                lang={option}
                className={LINK_CLASSES}
              >
                {APP_LOCALE_LABELS[option]}
              </Link>
            ),
          )}
        </nav>

        {ui.translationNotice && (
          <p className="mt-4 rounded-lg border border-black/[.08] bg-white/70 px-4 py-3 text-sm leading-6 text-zinc-700 dark:border-white/[.12] dark:bg-zinc-900/60 dark:text-zinc-300">
            {ui.translationNotice.text}{" "}
            <Link
              href={`${legalDocument.path}?lang=${DEFAULT_APP_LOCALE}`}
              hrefLang={DEFAULT_APP_LOCALE}
              lang={DEFAULT_APP_LOCALE}
              className={LINK_CLASSES}
            >
              {ui.translationNotice.linkLabel}
            </Link>
          </p>
        )}

        <article className="mt-6 flex flex-col gap-7 rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm sm:p-8 dark:border-white/[.12] dark:bg-zinc-900">
          {legalDocument.sections.map((section, index) => (
            <section key={section.heading} aria-labelledby={`${slug}-section-${index + 1}`}>
              <h2 id={`${slug}-section-${index + 1}`} className="text-lg font-semibold tracking-tight">
                {index + 1}. {section.heading}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>

        <nav aria-label={ui.legalNavLabel} className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          {otherDocuments.map((other) => (
            <Link key={other.slug} href={carry(other.path)} className={LINK_CLASSES}>
              {other.title}
            </Link>
          ))}
          <Link href="/" className={LINK_CLASSES}>
            {ui.backToHome}
          </Link>
        </nav>
      </div>
    </main>
  );
}
