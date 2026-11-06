import type { MetadataRoute } from "next";
import { LEGAL_DOCUMENT_PATHS, LEGAL_DOCUMENT_SLUGS } from "@/lib/legal-documents";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Most routes sit behind sign-in (and usually account activation), so only
// the public landing page and the legal documents are worth listing here.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...LEGAL_DOCUMENT_SLUGS.map((slug) => ({
      url: `${APP_URL}${LEGAL_DOCUMENT_PATHS[slug]}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
