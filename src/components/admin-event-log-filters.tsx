"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminEventLogFilterValues } from "@/lib/admin-event-log";

const DEBOUNCE_MS = 350;

type FilterValues = Omit<AdminEventLogFilterValues, "page">;

function toParams(filters: FilterValues, page = 1) {
  const params = new URLSearchParams({
    range: filters.range,
    severity: filters.severity ?? "all",
    module: filters.module ?? "all",
    page: String(page),
    limit: String(filters.limit),
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.range === "custom" && filters.from && filters.to) {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  return params;
}

export function adminEventLogFilterHref(filters: FilterValues, page = 1) {
  return `/admin/logs?${toParams(filters, page).toString()}`;
}

function utcDateTimeInputValue(value: string | null) {
  return value ? value.slice(0, 19) : "";
}

/**
 * This stays a GET form for no-JS use. With JavaScript, changing the global
 * search replaces URL state after a short pause; the server page remains the
 * sole place that validates the URL and reads event rows.
 */
export function AdminEventLogFilters({ filters }: { filters: AdminEventLogFilterValues }) {
  const router = useRouter();
  const [q, setQ] = useState(filters.q);

  useEffect(() => {
    if (q === filters.q) return;

    const timeout = window.setTimeout(() => {
      router.replace(adminEventLogFilterHref({ ...filters, q }, 1), { scroll: false });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [filters, q, router]);

  return (
    <form action="/admin/logs" method="get" className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <input type="hidden" name="page" value="1" />
      <div className="grid gap-4 lg:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Date range
          <select
            name="range"
            defaultValue={filters.range}
            className="rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          >
            <option value="today">Today (UTC)</option>
            <option value="last-7-days">Last 7 days (UTC)</option>
            <option value="current-month">Current month (UTC)</option>
            <option value="custom">Custom UTC interval</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Area
          <select
            name="module"
            defaultValue={filters.module ?? "all"}
            className="rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          >
            <option value="all">All modules</option>
            <option value="ESSAY_SERVICE">AI services</option>
            <option value="QUOTA_ACCESS">Quotas &amp; access</option>
            <option value="AUTH_SECURITY">Authentication</option>
            <option value="SYSTEM_INTEGRATION">System &amp; integrations</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Rows per page
          <select
            name="limit"
            defaultValue={String(filters.limit)}
            className="rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 text-sm font-medium lg:col-span-4">
          <legend className="p-0">Severity</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Severity">
            {[
              { value: "all", label: "All", symbol: null },
              { value: "INFO", label: "INFO", symbol: "🟢" },
              { value: "WARN", label: "WARN", symbol: "🟡" },
              { value: "ERROR", label: "ERROR", symbol: "🔴" },
            ].map((severity) => (
              <label key={severity.value} className="cursor-pointer">
                <input
                  type="radio"
                  name="severity"
                  value={severity.value}
                  defaultChecked={(filters.severity ?? "all") === severity.value}
                  className="peer sr-only"
                />
                <span className="flex w-full items-center justify-center rounded-full border border-black/[.15] px-3 py-2 text-xs font-medium text-zinc-700 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500/25 peer-checked:border-violet-700 peer-checked:bg-violet-700 peer-checked:text-white dark:border-white/[.2] dark:text-zinc-300 dark:peer-checked:border-violet-300 dark:peer-checked:bg-violet-300 dark:peer-checked:text-zinc-950">
                  {severity.symbol && <span aria-hidden="true">{severity.symbol} </span>}
                  {severity.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)_auto] lg:items-end">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Custom start (UTC)
          <input
            name="from"
            type="datetime-local"
            step="1"
            defaultValue={utcDateTimeInputValue(filters.from)}
            className="rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Custom end (UTC, exclusive)
          <input
            name="to"
            type="datetime-local"
            step="1"
            defaultValue={utcDateTimeInputValue(filters.to)}
            className="rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Search events
          <input
            name="q"
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            maxLength={120}
            placeholder="User ID, email, essay ID, or event"
            className="rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm font-normal outline-none placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          />
        </label>
        <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]">
          Apply filters
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        Custom intervals are UTC, end-exclusive, and limited to the last 30 days. Search updates after a short pause.
      </p>
    </form>
  );
}
