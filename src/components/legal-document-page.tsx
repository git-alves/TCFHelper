import Link from "next/link";
import {
  LEGAL_BRAND,
  LEGAL_DOCUMENT_LIST,
  LEGAL_EFFECTIVE_DATE,
  type LegalDocument,
} from "@/lib/legal-documents";

/** Shared layout for the public Terms, Privacy, and Refund pages. */
export function LegalDocumentPage({ legalDocument }: { legalDocument: LegalDocument }) {
  const otherDocuments = LEGAL_DOCUMENT_LIST.filter((other) => other.slug !== legalDocument.slug);

  return (
    <main className="flex-1 bg-gradient-to-b from-violet-100/70 via-violet-50/30 to-transparent px-4 py-12 sm:px-6 sm:py-16 dark:from-violet-950/40 dark:via-transparent">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-900 hover:text-violet-700 dark:text-zinc-100 dark:hover:text-violet-300"
        >
          {LEGAL_BRAND}
        </Link>
        <h1 className="mt-5 text-4xl font-bold tracking-tight">{legalDocument.title}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Effective date: {LEGAL_EFFECTIVE_DATE}</p>

        <article className="mt-8 flex flex-col gap-7 rounded-2xl border border-black/[.08] bg-white p-6 shadow-sm sm:p-8 dark:border-white/[.12] dark:bg-zinc-900">
          {legalDocument.sections.map((section, index) => (
            <section key={section.heading} aria-labelledby={`${legalDocument.slug}-section-${index + 1}`}>
              <h2 id={`${legalDocument.slug}-section-${index + 1}`} className="text-lg font-semibold tracking-tight">
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

        <nav aria-label="Legal documents" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium">
          {otherDocuments.map((other) => (
            <Link
              key={other.slug}
              href={other.path}
              className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
            >
              {other.title}
            </Link>
          ))}
          <Link
            href="/"
            className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
          >
            Back to home
          </Link>
        </nav>
      </div>
    </main>
  );
}
