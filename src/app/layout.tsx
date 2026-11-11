import type { Metadata } from "next";
import { Show } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AdminSupportInboxProvider } from "@/components/admin-support-inbox-count";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { ClerkLocaleProvider } from "@/components/clerk-locale-provider";
import { DashboardNavGuardProvider } from "@/components/dashboard-nav-guard";
import { FaviconSync } from "@/components/favicon-sync";
import { NavBar } from "@/components/nav-bar";
import { TimezoneReporter } from "@/components/timezone-reporter";
import { WalkthroughTriggerProvider } from "@/components/walkthrough-trigger";
import { getAppCopy } from "@/lib/app-copy";
import { getCurrentAppUser } from "@/lib/app-user";
import { getRequestLocale } from "@/lib/request-locale";
import { getNavSupportState } from "@/lib/support-inbox";
import { APP_FAVICON_LINK_ID, THEME_INIT_SCRIPT } from "@/lib/app-theme";
import { REVEAL_INIT_SCRIPT } from "@/lib/reveal-init-script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getAppCopy(locale);
  return {
    metadataBase: new URL(APP_URL),
    title: "MyTCFLab",
    description: copy.home.description,
  };
}

export default async function RootLayout({
  children,
  settings,
  support,
}: Readonly<{
  children: React.ReactNode;
  settings: React.ReactNode;
  support: React.ReactNode;
}>) {
  const [locale, appUser] = await Promise.all([
    getRequestLocale(),
    // A temporary lookup failure must not take down every page in the app --
    // just hide the nav's Admin link, same as the home page's blocked-user
    // check fails closed rather than failing the render. The one lookup also
    // answers the Admin-link question (what getCurrentAdminUser does).
    getCurrentAppUser().catch(() => null),
  ]);
  const isAdmin = appUser?.isAdmin === true;
  // The learner's support-resolution notice and the admin's new-ticket count
  // ride on this render instead of requests from the browser: a few indexed
  // lookups per full page load, nothing on client-side navigations and no
  // polling. The count query runs for the admin account only. Each fails soft
  // like the lookup above: no dot or badge is better than no page.
  const { supportNotice, adminSupportCount } = await getNavSupportState(appUser);

  return (
    <html
      lang={locale}
      // The blocking script below sets this element's `dark` class before
      // hydration, ahead of anything React knows about on the server; that
      // expected one-element mismatch is exactly what this prop is for.
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Rendered before the script below so it exists in the DOM by the
         * time that (synchronous, blocking) script runs and looks it up. */}
        <link rel="icon" id={APP_FAVICON_LINK_ID} href="/favicon-light.svg" type="image/svg+xml" />
        {/* Runs before first paint so a stored ("system" or explicit)
         * theme preference never flashes the wrong theme -- see
         * THEME_INIT_SCRIPT for why it also sets the favicon above. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Runs before first paint so the landing page's scroll-reveal
         * sections default to visible for every visitor except the ones
         * this confirms can actually animate them -- see
         * REVEAL_INIT_SCRIPT. */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppThemeProvider>
          <FaviconSync />
          <AppLocaleProvider initialLocale={locale}>
            <ClerkLocaleProvider>
              <DashboardNavGuardProvider>
                <WalkthroughTriggerProvider>
                  <Show when="signed-in">
                    <TimezoneReporter />
                  </Show>
                  <AdminSupportInboxProvider initialCount={adminSupportCount}>
                    <NavBar isAdmin={isAdmin} supportNotice={supportNotice} />
                    <div className="flex flex-1 flex-col">{children}</div>
                    {settings}
                    {support}
                  </AdminSupportInboxProvider>
                </WalkthroughTriggerProvider>
              </DashboardNavGuardProvider>
            </ClerkLocaleProvider>
          </AppLocaleProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
