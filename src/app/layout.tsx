import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/session-provider";
import { AppLocaleProvider } from "@/components/app-locale-provider";
import { NavBar } from "@/components/nav-bar";
import { getAppCopy } from "@/lib/app-copy";
import { getRequestLocale } from "@/lib/request-locale";

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
    title: "TCF Helper",
    description: `${copy.home.description} ${copy.home.translationDisclosure}`,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <AppLocaleProvider initialLocale={locale}>
            <NavBar />
            <div className="flex flex-1 flex-col">{children}</div>
          </AppLocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
