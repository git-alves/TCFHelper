"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  isAppTheme,
  type AppTheme,
  type ResolvedTheme,
} from "@/lib/app-theme";
import { safeGetLocalItem, safeSetLocalItem } from "@/lib/safe-storage";

interface AppThemeContextValue {
  theme: AppTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: AppTheme) => void;
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

// The theme preference lives in localStorage (a browser-only external
// system, just like matchMedia below), so useSyncExternalStore is the
// correct primitive: it resolves the client/server snapshot mismatch safely
// instead of reading localStorage during render or writing to state from an
// effect body.
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", notifyListeners);

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === APP_THEME_STORAGE_KEY) notifyListeners();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", notifyListeners);
    window.removeEventListener("storage", onStorage);
  };
}

// A choice that could not be written (storage blocked or full) still has to
// take effect, so it is held here for the rest of the page session.
let unsavedTheme: AppTheme | null = null;

/** Test seam: forgets a choice that was held only for the page session. */
export function resetUnsavedThemeForTest() {
  unsavedTheme = null;
}

function getStoredTheme(): AppTheme {
  if (unsavedTheme) return unsavedTheme;
  const stored = safeGetLocalItem(APP_THEME_STORAGE_KEY);
  return isAppTheme(stored) ? stored : DEFAULT_APP_THEME;
}

function getServerTheme(): AppTheme {
  return DEFAULT_APP_THEME;
}

function resolve(theme: AppTheme): ResolvedTheme {
  return theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
}

function getResolvedTheme(): ResolvedTheme {
  return resolve(getStoredTheme());
}

// Matches the server-rendered default ("system" resolves to "light" here)
// so hydration has a deterministic snapshot to reconcile against; the
// blocking script in the root layout's <head> already painted the correct
// class before this ever runs, so this default is never actually visible.
function getServerResolvedTheme(): ResolvedTheme {
  return "light";
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getStoredTheme, getServerTheme);
  const resolvedTheme = useSyncExternalStore(subscribe, getResolvedTheme, getServerResolvedTheme);

  // Applying the resolved theme to the DOM is exactly what effects are for:
  // synchronizing React state with an external system (here, the <html>
  // class Tailwind's `dark:` variant and Clerk's appearance both key off).
  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((next: AppTheme) => {
    if (!isAppTheme(next)) return;
    unsavedTheme = safeSetLocalItem(APP_THEME_STORAGE_KEY, next) ? null : next;
    notifyListeners();
  }, []);

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within an AppThemeProvider");
  }
  return ctx;
}
