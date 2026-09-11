import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomeHero } from "@/components/home-hero";
import { APP_LOCALE_INTL_TAGS } from "@/lib/app-locale";
import { isCurrentRequestBlocked } from "@/lib/blocked-user";
import { LANDING_PAGE_COPY } from "@/lib/landing-page-copy";
import { getRequestLocale } from "@/lib/request-locale";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Overrides the root layout's generic title/description for this route with
// the landing page's own copy (LANDING_PAGE_COPY, the same source home-hero.tsx
// renders from) instead of the unrelated app-copy.ts description the layout
// falls back to -- those two had drifted out of sync with what's actually on
// the page. Also the only route that gets Open Graph/Twitter/canonical tags,
// since it's the only page search engines and link previews ever see
// unauthenticated (see robots.ts).
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = LANDING_PAGE_COPY[locale];
  const title = `MyTCFLab — ${copy.title}`;

  return {
    title,
    description: copy.description,
    alternates: { canonical: APP_URL },
    openGraph: {
      title,
      description: copy.description,
      url: APP_URL,
      siteName: "MyTCFLab",
      locale: APP_LOCALE_INTL_TAGS[locale].replace("-", "_"),
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description: copy.description,
    },
  };
}

export default async function Home() {
  const [{ userId }, isBlocked] = await Promise.all([
    auth(),
    // A temporary lookup failure must not take down the public marketing
    // page. Protected routes still fail closed through getCurrentAppUser().
    isCurrentRequestBlocked().catch(() => false),
  ]);

  // Keep every verified blocked entry point on the same recovery surface.
  // The modal itself signs out only when the person closes it, after they
  // have had an opportunity to contact support.
  if (isBlocked) redirect("/blocked");

  return <HomeHero isAuthenticated={Boolean(userId)} />;
}
