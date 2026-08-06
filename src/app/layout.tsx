import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { AppThemeProvider } from "@/components/app-theme-provider";
import { ClerkLocaleProvider } from "@/components/clerk-locale-provider";
import { NavBar } from "@/components/nav-bar";
import { getAppCopy } from "@/lib/app-copy";
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
}: Readonly<{
  children: React.ReactNode;
  settings: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

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
              <NavBar />
              <div className="flex flex-1 flex-col">{children}</div>
              {settings}
            </ClerkLocaleProvider>
          </AppLocaleProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
