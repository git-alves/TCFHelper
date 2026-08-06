"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { enUS, esES, frFR, ptBR } from "@clerk/localizations";
import { dark } from "@clerk/themes";
import type { ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
import { useAppTheme } from "@/components/app-theme-provider";
import type { AppLocale } from "@/lib/app-locale";

const CLERK_LOCALIZATIONS = {
  en: enUS,
  fr: frFR,
  es: esES,
  pt: ptBR,
} satisfies Record<AppLocale, typeof enUS>;

// Keep Clerk's prebuilt screens aligned with the product language picker.
// The app locale provider remains outside this component because it is also
// responsible for the server-readable locale cookie.
export function ClerkLocaleProvider({ children }: { children: ReactNode }) {
  const { locale } = useAppLocale();
  const { resolvedTheme } = useAppTheme();

  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      // Returning learners land on their progress; a brand-new account has
      // none yet, so it goes straight to starting a task instead.
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/tasks"
      afterSignOutUrl="/"
      localization={CLERK_LOCALIZATIONS[locale]}
      // @clerk/themes' prebuilt themes are spread directly into `appearance`
      // in this Clerk version rather than passed through a `baseTheme` key.
      appearance={resolvedTheme === "dark" ? { ...dark, cssLayerName: "clerk" } : { cssLayerName: "clerk" }}
    >
      {children}
    </ClerkProvider>
  );
}
