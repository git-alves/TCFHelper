"use client";

import { useAppCopy } from "@/components/app-locale-provider";

// A valid Clerk session is not enough to safely write learner-owned records:
// imports and first sign-ins still need a verified mapping to the app CUID.
// Keep this state visible and localized instead of leaking a resolver error
// or treating Clerk's subject as a database foreign key.
export function DashboardAccountUnavailable() {
  const copy = useAppCopy();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-3 px-6 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">
        {copy.dashboard.accountUnavailableTitle}
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {copy.dashboard.accountUnavailableDescription}
      </p>
    </main>
  );
}
