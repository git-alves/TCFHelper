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

// Kept in one place so the pre-hydration blocking script (a literal string
// injected into <head>) and the client provider resolve "system" identically.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem(${JSON.stringify(APP_THEME_STORAGE_KEY)});
    var theme = ${JSON.stringify(APP_THEMES)}.indexOf(stored) === -1 ? ${JSON.stringify(DEFAULT_APP_THEME)} : stored;
    var resolved = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  } catch (e) {}
})();
`;
