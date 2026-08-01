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
  const hasExplicitLocaleSelection = useRef(false);
  const localeChangeId = useRef(0);
  const localePersistenceQueue = useRef<Promise<void>>(Promise.resolve());
  const currentLocale = useRef(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const persistLocale = useCallback(
    (
      next: AppLocale,
      onSettled?: (persisted: boolean) => void,
    ) => {
      const changeId = ++localeChangeId.current;

      // Server actions can finish out of order when a learner changes the
      // picker quickly. Serialising writes keeps the cookie's last value in
      // sync with the last selection; the id prevents an old completion from
      // repainting or refreshing the UI.
      localePersistenceQueue.current = localePersistenceQueue.current
        .catch(() => undefined)
        .then(() => persistAppLocale(next))
        .then(() => {
          if (changeId !== localeChangeId.current) return;
          onSettled?.(true);
          router.refresh();
        })
        .catch(() => {
          if (changeId === localeChangeId.current) onSettled?.(false);
        });
    },
    [router],
  );

  useEffect(() => {
    if (hasMigratedLegacyPreference.current) return;
    hasMigratedLegacyPreference.current = true;

    const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
    if (!isAppLocale(stored) || stored === initialLocale) {
      window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, initialLocale);
      return;
    }

    // Passive effects run after the first paint. If the learner has already
    // used the picker, their new choice must win over this one-time migration
    // even if the legacy value has not been queued yet.
    if (hasExplicitLocaleSelection.current) return;

    // Wait until the cookie is persisted before switching client copy. This
    // avoids a render where Server Components still use the old locale, and
    // keeps the legacy-localStorage migration asynchronous rather than
    // synchronously deriving state inside this effect.
    persistLocale(stored, (persisted) => {
      // Keep the server-rendered locale if migration cannot write its cookie.
      // An explicit picker choice remains optimistic (and is retried from
      // localStorage on a later visit), but a failed passive migration should
      // never put client and server copy into different languages.
      if (!persisted) return;

      // Do not let a delayed migration overwrite a selection made after
      // hydration. `persistLocale` only calls this for the newest request.
      currentLocale.current = stored;
      setCurrentLocale(stored);
    });
  }, [initialLocale, persistLocale]);

  const setLocale = useCallback((next: AppLocale) => {
    if (!isAppLocale(next) || next === currentLocale.current) return;

    // Client copy changes immediately. Once the server action has written
    // the HttpOnly cookie, refresh Server Components and metadata as well.
    hasExplicitLocaleSelection.current = true;
    currentLocale.current = next;
    setCurrentLocale(next);
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, next);
    persistLocale(next);
  }, [persistLocale]);

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
