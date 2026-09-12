export const APP_THEMES = ["light", "dark", "system"] as const;

export type AppTheme = (typeof APP_THEMES)[number];

// "system" defers to the OS preference so a first-time visitor's experience
// is unchanged from before manual theme control existed.
export const DEFAULT_APP_THEME: AppTheme = "system";

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && (APP_THEMES as readonly string[]).includes(value);
}

// The theme is purely a client-side display preference (unlike the app
// locale, it never changes server-rendered copy), so localStorage alone is
// the source of truth; there is no cookie or server action for it.
export const APP_THEME_STORAGE_KEY = "mytcflab:app-theme";

// What "system" actually resolves to, and the only two values Tailwind's
// `dark` class variant and Clerk's `appearance.baseTheme` care about.
export type ResolvedTheme = "light" | "dark";

// The <link rel="icon"> element both the blocking script below and
// FaviconSync (see favicon-sync.tsx) update in place, rather than each
// picking their own id and risking a mismatch.
export const APP_FAVICON_LINK_ID = "app-favicon";

// Kept in one place so the pre-hydration blocking script (a literal string
// injected into <head>) and the client provider resolve "system" identically.
//
// Also sets the favicon here, before first paint: the landing page ("/") is
// unconditionally dark regardless of the resolved theme, while every other
// route follows it. Without this the favicon would flash the wrong variant
// on load, then jump once FaviconSync's effect runs after hydration.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem(${JSON.stringify(APP_THEME_STORAGE_KEY)});
    var theme = ${JSON.stringify(APP_THEMES)}.indexOf(stored) === -1 ? ${JSON.stringify(DEFAULT_APP_THEME)} : stored;
    var resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    var faviconTheme = window.location.pathname === "/" ? "dark" : resolved;
    var favicon = document.getElementById(${JSON.stringify(APP_FAVICON_LINK_ID)});
    if (favicon) favicon.setAttribute("href", "/favicon-" + faviconTheme + ".svg");
  } catch (e) {}
})();
`;
