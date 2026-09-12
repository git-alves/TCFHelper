"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAppTheme } from "@/components/app-theme-provider";
import { APP_FAVICON_LINK_ID } from "@/lib/app-theme";

// Keeps the favicon in sync after the initial (blocking-script-driven) paint:
// client-side navigation and in-app theme toggles don't re-run <head>, so
// this effect is what catches "/" <-> tool route changes and light/dark
// switches once the page is already interactive. The landing page ("/") is
// always dark regardless of the resolved theme, matching its hardcoded dark
// header/hero -- everywhere else follows the actual resolved theme.
export function FaviconSync() {
  const pathname = usePathname();
  const { resolvedTheme } = useAppTheme();

  useEffect(() => {
    const faviconTheme = pathname === "/" ? "dark" : resolvedTheme;
    const link = document.getElementById(APP_FAVICON_LINK_ID);
    if (link instanceof HTMLLinkElement) link.href = `/favicon-${faviconTheme}.svg`;
  }, [pathname, resolvedTheme]);

  return null;
}
