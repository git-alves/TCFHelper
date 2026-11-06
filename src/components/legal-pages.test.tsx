import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { APP_LOCALES, type AppLocale } from "@/lib/app-locale";

vi.mock("@/components/app-locale-provider", () => ({ useAppLocale: () => ({ locale: mockLocale.current }) }));
const mockLocale: { current: AppLocale } = vi.hoisted(() => ({ current: "en" }));

const { LegalConsentNotice } = await import("@/components/legal-consent-notice");
const { LegalDocumentPage } = await import("@/components/legal-document-page");
const { default: sitemap } = await import("@/app/sitemap");
const {
  LEGAL_DOCUMENT_SLUGS,
  formatLegalEffectiveDate,
  getLegalDocument,
  getLegalDocumentList,
  getLegalUi,
} = await import("@/lib/legal-documents");
const { LEGAL_LINK_COPY } = await import("@/lib/legal-link-copy");

describe("legal documents", () => {
  it("defines Terms of Service, Privacy Policy, and Refund Policy at /terms, /privacy, /refund", () => {
    expect(getLegalDocumentList("en").map((d) => [d.title, d.path])).toEqual([
      ["Terms of Service", "/terms"],
      ["Privacy Policy", "/privacy"],
      ["Refund Policy", "/refund"],
    ]);
  });

  it.each(APP_LOCALES)("has all three documents, fully populated, in %s", (locale) => {
    for (const slug of LEGAL_DOCUMENT_SLUGS) {
      const doc = getLegalDocument(slug, locale);
      expect(doc.title.length).toBeGreaterThan(0);
      expect(doc.description.length).toBeGreaterThan(0);
      expect(doc.sections.length).toBe(getLegalDocument(slug, "en").sections.length);
      for (const section of doc.sections) {
        expect(section.heading.length).toBeGreaterThan(0);
        expect(section.paragraphs.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every translation's paragraph structure aligned with English, so none silently drops a clause", () => {
    for (const locale of APP_LOCALES) {
      for (const slug of LEGAL_DOCUMENT_SLUGS) {
        const shape = (l: AppLocale) => getLegalDocument(slug, l).sections.map((s) => s.paragraphs.length);
        expect(shape(locale)).toEqual(shape("en"));
      }
    }
  });

  it("carries the support address and the same numeric commitments (14 days, 2 business days, 30 days) in every language", () => {
    for (const locale of APP_LOCALES) {
      const text = (slug: "terms" | "privacy" | "refund") =>
        getLegalDocument(slug, locale).sections.flatMap((s) => s.paragraphs).join(" ");
      expect(text("terms")).toContain("support@mytcflab.com");
      expect(text("privacy")).toContain("support@mytcflab.com");
      expect(text("refund")).toContain("support@mytcflab.com");
      expect(text("refund")).toMatch(/\b14\b/);
      expect(text("refund")).toMatch(/\b2\b/);
      expect(text("refund")).toMatch(/5\b.*\b10\b/);
      expect(text("privacy")).toMatch(/\b30\b/);
    }
  });

  it("formats the effective date in each locale", () => {
    expect(formatLegalEffectiveDate("en")).toBe("November 6, 2026");
    expect(formatLegalEffectiveDate("fr")).toBe("6 novembre 2026");
    expect(formatLegalEffectiveDate("es")).toBe("6 de noviembre de 2026");
    expect(formatLegalEffectiveDate("pt")).toBe("6 de novembro de 2026");
  });
});

describe("LegalDocumentPage", () => {
  it.each(APP_LOCALES)("renders every numbered section, the date, and lang=%s", (locale) => {
    const doc = getLegalDocument("privacy", locale);
    const html = renderToStaticMarkup(<LegalDocumentPage slug="privacy" locale={locale} />);

    expect(html).toContain(`lang="${locale}"`);
    expect(html).toContain(`>${doc.title}</h1>`);
    expect(html).toContain(`${getLegalUi(locale).effectiveDate} ${formatLegalEffectiveDate(locale)}`);
    doc.sections.forEach((section, index) => {
      expect(html).toContain(`${index + 1}. ${section.heading}`);
    });
  });

  it("offers the other three languages as links and marks the current one", () => {
    const html = renderToStaticMarkup(<LegalDocumentPage slug="terms" locale="fr" />);

    expect(html).toContain('href="/terms?lang=en"');
    expect(html).toContain('href="/terms?lang=es"');
    expect(html).toContain('href="/terms?lang=pt"');
    expect(html).not.toContain('href="/terms?lang=fr"');
  });

  it("tells translated readers that English controls and links to it; English pages carry no such notice", () => {
    const fr = renderToStaticMarkup(<LegalDocumentPage slug="refund" locale="fr" />);
    const en = renderToStaticMarkup(<LegalDocumentPage slug="refund" locale="en" />);

    expect(fr).toContain("la version anglaise prévaut");
    expect(fr).toContain("Lire la version anglaise");
    expect(en).not.toContain("prevails");
  });

  it("links the other two documents (not itself) and carries a pinned ?lang= forward", () => {
    const plain = renderToStaticMarkup(<LegalDocumentPage slug="privacy" locale="en" />);
    const pinned = renderToStaticMarkup(<LegalDocumentPage slug="privacy" locale="es" pinned />);
    const nav = (html: string, label: string) => html.slice(html.indexOf(`aria-label="${label}"`));

    expect(nav(plain, "Legal documents")).toContain('href="/terms"');
    expect(nav(plain, "Legal documents")).toContain('href="/refund"');
    expect(nav(plain, "Legal documents")).not.toContain('href="/privacy"');
    expect(nav(pinned, "Documentos legales")).toContain('href="/terms?lang=es"');
    expect(nav(pinned, "Documentos legales")).toContain('href="/refund?lang=es"');
  });
});

describe("LegalConsentNotice", () => {
  it("links the three policies from the sign-in/sign-up agreement line", () => {
    mockLocale.current = "en";
    const html = renderToStaticMarkup(<LegalConsentNotice />);

    expect(html).toContain("By continuing, you agree to our");
    expect(html).toMatch(/href="\/terms"[^>]*>Terms of Service</);
    expect(html).toMatch(/href="\/privacy"[^>]*>Privacy Policy</);
    expect(html).toMatch(/href="\/refund"[^>]*>Refund Policy</);
  });

  it.each(["fr", "es", "pt"] as const)("renders the agreement line in %s with localized link names", (locale) => {
    mockLocale.current = locale;
    const html = renderToStaticMarkup(<LegalConsentNotice />);
    const { titles, consent } = LEGAL_LINK_COPY[locale];

    expect(html).toContain(consent.lead);
    expect(html).toMatch(new RegExp(`href="/terms"[^>]*>${titles.terms}<`));
    expect(html).toMatch(new RegExp(`href="/privacy"[^>]*>${titles.privacy}<`));
    expect(html).toMatch(new RegExp(`href="/refund"[^>]*>${titles.refund}<`));
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
