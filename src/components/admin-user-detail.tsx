import Link from "next/link";
import { AdminQuotaOverrideForm } from "@/components/admin-quota-override-form";
import { AdminUserAccountStatus } from "@/components/admin-user-account-status";
import type { AdminUserDetail as AdminUserDetailRecord } from "@/lib/admin-users";
import { DEFAULT_USER_QUOTA_LIMITS } from "@/lib/user-quota-limits";

interface AdminUserDetailProps {
  user: AdminUserDetailRecord;
  currentAdminId: string;
}

function count(value: number) {
  return value.toLocaleString("en-US");
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AdminUserDetail({ user, currentAdminId }: AdminUserDetailProps) {
  const isCurrentAdmin = user.id === currentAdminId;
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div>
        <Link href="/admin/users" className="text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">
          ← All users
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin · User details</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{user.name ?? user.email}</h1>
            {user.name && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{user.email}</p>}
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {user.isAdmin && <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-900 dark:bg-violet-950 dark:text-violet-200">Owner account</span>}
            {user.isBlocked ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-800 dark:bg-red-950 dark:text-red-200">Blocked</span>
            ) : user.isAdmin ? (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-900 dark:bg-violet-950 dark:text-violet-200">Owner access</span>
            ) : user.activatedAt ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Activated {dateTime(user.activatedAt)}</span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950 dark:text-amber-200">Awaiting access code</span>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Joined {dateTime(user.createdAt)}.</p>
      </div>

      <section aria-labelledby="usage-heading">
        <div className="mb-3">
          <h2 id="usage-heading" className="text-base font-semibold">Current API usage</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Counters reflect their exact active UTC window; they are not a historical billing report.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
            <p className="text-sm font-medium">Translation</p>
            <p className="mt-2 text-2xl font-semibold">{count(user.usage.translation.currentMonthCharacters)}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">characters this month</p>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{count(user.usage.translation.currentMinuteRequests)} requests / {count(user.usage.translation.currentMinuteCharacters)} chars this minute</p>
          </div>
          <div className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
            <p className="text-sm font-medium">Examples</p>
            <p className="mt-2 text-2xl font-semibold">{count(user.usage.examples.currentDayRequests)}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">fresh generations today</p>
          </div>
          <div className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
            <p className="text-sm font-medium">Corrections</p>
            <p className="mt-2 text-2xl font-semibold">{count(user.usage.corrections.currentDayRequests)}</p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">today · {count(user.usage.corrections.currentMonthRequests)} this month</p>
          </div>
        </div>
      </section>

      <AdminQuotaOverrideForm
        userId={user.id}
        email={user.email}
        overrides={user.quotaOverride}
        globalDefaults={DEFAULT_USER_QUOTA_LIMITS}
      />

      <AdminUserAccountStatus
        userId={user.id}
        email={user.email}
        isBlocked={user.isBlocked}
        isCurrentAdmin={isCurrentAdmin}
      />
    </main>
  );
}
