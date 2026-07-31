"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { persistAppLocale } from "@/app/locale-actions";
import {
  APP_LOCALE_STORAGE_KEY,
  isAppLocale,
  type AppLocale,
} from "@/lib/app-locale";
import { getAppCopy, type AppCopy } from "@/lib/app-copy";

interface AppLocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

// The cookie is the source of truth so Server Components can render the
// chosen language. localStorage is only retained to migrate the previous
// feedback-language preference without losing it for existing learners.
export function AppLocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: AppLocale;
}) {
  const [locale, setCurrentLocale] = useState(initialLocale);
  const router = useRouter();
  const hasMigratedLegacyPreference = useRef(false);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (hasMigratedLegacyPreference.current) return;
    hasMigratedLegacyPreference.current = true;

    const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
    if (!isAppLocale(stored) || stored === initialLocale) {
      window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, initialLocale);
      return;
    }

    // Wait until the cookie is persisted before switching client copy. This
    // avoids a render where Server Components still use the old locale, and
    // keeps the legacy-localStorage migration asynchronous rather than
    // synchronously deriving state inside this effect.
    void persistAppLocale(stored)
      .then(() => {
        setCurrentLocale(stored);
        router.refresh();
      })
      .catch(() => {
        // The previous browser-only preference still provides a useful
        // session-local fallback if the persistence request is interrupted.
        setCurrentLocale(stored);
      });
  }, [initialLocale, router]);

  const setLocale = useCallback((next: AppLocale) => {
    if (!isAppLocale(next) || next === locale) return;

    // Client copy changes immediately. Once the server action has written
    // the HttpOnly cookie, refresh Server Components and metadata as well.
    setCurrentLocale(next);
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, next);
    void persistAppLocale(next)
      .then(() => router.refresh())
      .catch(() => undefined);
  }, [locale, router]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <AppLocaleContext.Provider value={value}>
      {children}
    </AppLocaleContext.Provider>
  );
}

export function useAppLocale(): AppLocaleContextValue {
  const ctx = useContext(AppLocaleContext);
  if (!ctx) {
    throw new Error("useAppLocale must be used within an AppLocaleProvider");
  }
  return ctx;
}

// Static interface copy follows the same client-side preference as the
// feedback and translation target. Server components can pass their
// authorization decisions into small client display components without
// needing access to this browser-only preference.
export function useAppCopy(): AppCopy {
  const { locale } = useAppLocale();
  return getAppCopy(locale);
}
