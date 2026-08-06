"use client";

import { useAppCopy } from "@/components/app-locale-provider";

// Content only, no page-level wrapper: this is embedded both inside a
// standalone <main> (see DashboardAccountUnavailable) and inside the
// settings modal's dialog, which must not contain a nested <main> landmark.
export function AccountUnavailableMessage() {
  const copy = useAppCopy();

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{copy.dashboard.accountUnavailableTitle}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{copy.dashboard.accountUnavailableDescription}</p>
    </>
  );
}
