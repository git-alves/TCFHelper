"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  APP_LOCALE_STORAGE_KEY,
  DEFAULT_APP_LOCALE,
  isAppLocale,
  type AppLocale,
} from "@/lib/app-locale";

interface AppLocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);
const APP_LOCALE_CHANGE_EVENT = "tcfhelper:app-locale-change";

function getBrowserLocale(): AppLocale {
  const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  return isAppLocale(stored) ? stored : DEFAULT_APP_LOCALE;
}

function getServerLocale(): AppLocale {
  return DEFAULT_APP_LOCALE;
}

function subscribeToLocale(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(APP_LOCALE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(APP_LOCALE_CHANGE_EVENT, callback);
  };
}

// Client-only preference for now: persisted to localStorage, not the
// per-user `User.locale` column. Wiring it to a real account setting is a
// natural follow-up once there's a profile/settings page to host the picker.
export function AppLocaleProvider({ children }: { children: ReactNode }) {
  // `useSyncExternalStore` keeps the server snapshot deterministic while
  // still restoring the browser preference after hydration without a state
  // update inside an effect.
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getBrowserLocale,
    getServerLocale,
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: AppLocale) {
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, next);
    window.dispatchEvent(new Event(APP_LOCALE_CHANGE_EVENT));
  }

  return (
    <AppLocaleContext.Provider value={{ locale, setLocale }}>
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
