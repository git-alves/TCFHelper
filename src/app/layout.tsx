import type { Metadata } from "next";
import { Show } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { ClerkLocaleProvider } from "@/components/clerk-locale-provider";
import { DashboardNavGuardProvider } from "@/components/dashboard-nav-guard";
import { NavBar } from "@/components/nav-bar";
import { TimezoneReporter } from "@/components/timezone-reporter";
import { WalkthroughTriggerProvider } from "@/components/walkthrough-trigger";
import { getAppCopy } from "@/lib/app-copy";
import { getCurrentAdminUser } from "@/lib/app-user";
import { getRequestLocale } from "@/lib/request-locale";
import { THEME_INIT_SCRIPT } from "@/lib/app-theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getAppCopy(locale);
  return {
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
  const [locale, adminUser] = await Promise.all([
    getRequestLocale(),
    // A temporary lookup failure must not take down every page in the app --
    // just hide the nav's Admin link, same as the home page's blocked-user
    // check fails closed rather than failing the render.
    getCurrentAdminUser().catch(() => null),
  ]);
  const isAdmin = adminUser !== null;

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
        {/* Runs before first paint so a stored ("system" or explicit)
         * theme preference never flashes the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppThemeProvider>
          <AppLocaleProvider initialLocale={locale}>
            <ClerkLocaleProvider>
              <DashboardNavGuardProvider>
                <WalkthroughTriggerProvider>
                  <Show when="signed-in">
                    <TimezoneReporter />
                  </Show>
                  <NavBar isAdmin={isAdmin} />
                  <div className="flex flex-1 flex-col">{children}</div>
                  {settings}
                  {support}
                </WalkthroughTriggerProvider>
              </DashboardNavGuardProvider>
            </ClerkLocaleProvider>
          </AppLocaleProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
