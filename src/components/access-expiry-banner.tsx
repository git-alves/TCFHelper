"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { accessExpiryDismissalStorageKey, dateParts, formatAccessExpiry, isAccessExpiryDismissed, isLearnerAppPath } from "@/lib/access-code-expiry-warning";
import { safeGetLocalItem, safeSetLocalItem } from "@/lib/safe-storage";
import type { AccessExpiryNotice } from "@/lib/access-expiry-notice";

export function AccessExpiryBanner({ notice }: { notice: AccessExpiryNotice | null }) {
  const copy = useAppCopy().accessExpiry;
  const { locale } = useAppLocale();
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (notice) {
      // localStorage is intentionally read after hydration; this state only
      // reconciles the server-rendered banner with a prior local dismissal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(isAccessExpiryDismissed({ getItem: safeGetLocalItem }, notice.accessCodeId, notice.todayKey));
    }
  }, [notice]);
  const inLearnerApp = isLearnerAppPath(pathname);
  if (!notice || dismissed || !inLearnerApp) return null;
  const tag = locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : `${locale}-${locale.toUpperCase()}`;
  const expires = new Date(notice.expiresAt);
  const dateOptions: Intl.DateTimeFormatOptions = { day: "numeric", month: "numeric", timeZone: notice.timezone ?? "UTC" };
  if (dateParts(expires, notice.timezone)[0] !== Number(notice.todayKey.slice(0, 4))) dateOptions.year = "numeric";
  const date = formatAccessExpiry(expires, tag, notice.timezone, dateOptions);
  const time = formatAccessExpiry(expires, tag, notice.timezone, { hour: "numeric", minute: "2-digit" });
  const message = notice.days === 0 ? copy.bannerToday({ time, date }) : notice.days === 1 ? copy.bannerTomorrow({ date }) : copy.bannerDays({ days: notice.days, date });

  return (
    <aside className="border-b border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100" aria-label={copy.bannerAriaLabel}>
      <div className="mx-auto flex w-full max-w-7xl items-start gap-3 sm:items-center">
        <span aria-hidden className="mt-0.5 text-violet-700 dark:text-violet-300">◷</span><p className="flex-1">{message}</p>
        <button type="button" className="font-medium underline underline-offset-4" onClick={() => {
          safeSetLocalItem(accessExpiryDismissalStorageKey(notice.accessCodeId), notice.todayKey);
          setDismissed(true);
        }} aria-label={copy.dismiss}>×</button>
      </div>
    </aside>
  );
}
