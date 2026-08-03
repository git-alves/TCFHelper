"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { enUS, esES, frFR, ptBR } from "@clerk/localizations";
import type { ReactNode } from "react";
import { useAppLocale } from "@/components/app-locale-provider";
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

  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
      afterSignOutUrl="/"
      localization={CLERK_LOCALIZATIONS[locale]}
      appearance={{ cssLayerName: "clerk" }}
    >
      {children}
    </ClerkProvider>
  );
}
