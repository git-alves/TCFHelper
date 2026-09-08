"use client";

import { useEffect } from "react";

// Remembers the last timezone this browser successfully reported, so a
// signed-in learner's every page load doesn't re-send an unchanged value.
const STORAGE_KEY = "mytcflab:reportedTimezone";

/**
 * The server can never know a learner's local timezone on its own -- only
 * the browser does. Mounted once for every signed-in page load; reports at
 * most once per changed value per browser, and fails silently since this is
 * cosmetic (admin display formatting), never something a real request
 * depends on.
 */
export function TimezoneReporter() {
  useEffect(() => {
    let timezone: string;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!timezone) return;

    try {
      if (window.localStorage.getItem(STORAGE_KEY) === timezone) return;
    } catch {
      // Storage access can fail (private browsing, disabled storage) --
      // fall through and report anyway rather than get stuck never trying.
    }

    fetch("/api/me/timezone", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) return;
        try {
          window.localStorage.setItem(STORAGE_KEY, timezone);
        } catch {
          // Non-fatal: worst case this reports again next page load.
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
