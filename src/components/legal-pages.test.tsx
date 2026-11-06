import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalConsentNotice } from "@/components/legal-consent-notice";
import { LegalDocumentPage } from "@/components/legal-document-page";
import { LEGAL_DOCUMENT_LIST, LEGAL_DOCUMENTS, LEGAL_EFFECTIVE_DATE } from "@/lib/legal-documents";
import sitemap from "@/app/sitemap";

describe("legal documents", () => {
  it("defines Terms of Service, Privacy Policy, and Refund Policy at /terms, /privacy, /refund", () => {
    expect(LEGAL_DOCUMENT_LIST.map((d) => [d.title, d.path])).toEqual([
      ["Terms of Service", "/terms"],
      ["Privacy Policy", "/privacy"],
      ["Refund Policy", "/refund"],
    ]);
  });

  it.each(LEGAL_DOCUMENT_LIST)("renders $title with its effective date and every numbered section", (doc) => {
    const html = renderToStaticMarkup(<LegalDocumentPage legalDocument={doc} />);

    expect(html).toContain(`<h1 class="mt-5 text-4xl font-bold tracking-tight">${doc.title}</h1>`);
    expect(html).toContain(`Effective date: ${LEGAL_EFFECTIVE_DATE}`);
    doc.sections.forEach((section, index) => {
      expect(section.paragraphs.length).toBeGreaterThan(0);
      expect(html).toContain(`${index + 1}. ${section.heading}`);
    });
  });

  it("links each page to the other two documents but not to itself", () => {
    const html = renderToStaticMarkup(<LegalDocumentPage legalDocument={LEGAL_DOCUMENTS.privacy} />);
    const nav = html.slice(html.indexOf('aria-label="Legal documents"'));

    expect(nav).toContain('href="/terms"');
    expect(nav).toContain('href="/refund"');
    expect(nav).not.toContain('href="/privacy"');
  });
});

describe("LegalConsentNotice", () => {
  it("links the three policies from the sign-in/sign-up agreement line", () => {
    const html = renderToStaticMarkup(<LegalConsentNotice />);

    expect(html).toContain("By continuing, you agree to our");
    expect(html).toMatch(/href="\/terms"[^>]*>Terms of Service</);
    expect(html).toMatch(/href="\/privacy"[^>]*>Privacy Policy</);
    expect(html).toMatch(/href="\/refund"[^>]*>Refund Policy</);
  });
});

describe("sitemap", () => {
  it("lists the public legal pages", () => {
    const urls = sitemap().map((entry) => entry.url);

    for (const path of ["/terms", "/privacy", "/refund"]) {
      expect(urls.some((url) => url.endsWith(path))).toBe(true);
    }
  });
});
