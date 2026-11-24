"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppCopy, useAppLocale } from "@/components/app-locale-provider";
import { accessExpiryDismissalStorageKey, ACCESS_EXPIRY_SUPPORT_HREF } from "@/lib/access-code-expiry-warning";
import { safeGetLocalItem, safeSetLocalItem } from "@/lib/safe-storage";
import type { AccessExpiryNotice } from "@/lib/access-expiry-notice";

export function AccessExpiryBanner({ notice }: { notice: AccessExpiryNotice | null }) {
  const copy = useAppCopy().accessExpiry;
  const { locale } = useAppLocale();
  const initiallyDismissed = notice !== null && safeGetLocalItem(accessExpiryDismissalStorageKey(notice.accessCodeId)) === notice.todayKey;
  const [dismissed, setDismissed] = useState(initiallyDismissed);
  if (!notice || dismissed) return null;
  const endDate = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : locale, { dateStyle: "long", timeZone: notice.timezone ?? "UTC" }).format(new Date(notice.expiresAt));

  return (
    <aside className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100" aria-label="Access expiry notice">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2">
        <p className="flex-1">{copy.banner({ days: notice.days, endDate })}</p>
        <Link href={ACCESS_EXPIRY_SUPPORT_HREF} className="font-medium underline underline-offset-4">{copy.requestNewCode}</Link>
        <button type="button" className="font-medium underline underline-offset-4" onClick={() => {
          safeSetLocalItem(accessExpiryDismissalStorageKey(notice.accessCodeId), notice.todayKey);
          setDismissed(true);
        }}>{copy.dismiss}</button>
      </div>
    </aside>
  );
}
