import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Everything except the public landing page requires a signed-in (and, for
// most routes, activated) account, so there is nothing for a crawler to
// usefully index there -- disallowing it keeps crawl budget on the one page
// that matters and avoids indexing auth redirects.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/activate",
        "/admin",
        "/api",
        "/blocked",
        "/dashboard",
        "/login",
        "/practice",
        "/settings",
        "/signup",
        "/support",
        "/tasks",
      ],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
