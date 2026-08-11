import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminEventLogFilters } from "@/components/admin-event-log-filters";
import { AdminEventLogTable } from "@/components/admin-event-log-table";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import {
  AdminEventLogQueryError,
  AdminEventLogSearchTooBroadError,
  adminEventLogHref,
  getAdminEventLogPage,
  parseAdminEventLogQuery,
  type AdminEventLogPage,
  type AdminEventLogSearchParams,
} from "@/lib/admin-event-log";

interface AdminLogsPageProps {
  searchParams: Promise<AdminEventLogSearchParams>;
}

function formatUtc(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default async function AdminLogsPage({ searchParams }: AdminLogsPageProps) {
  try {
    if (!(await getCurrentAdminUser())) notFound();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }

  const now = new Date();
  let query;
  try {
    query = parseAdminEventLogQuery(await searchParams, now);
  } catch (error) {
    if (error instanceof AdminEventLogQueryError) redirect("/admin/logs");
    throw error;
  }
  let eventPage: AdminEventLogPage | null = null;
  try {
    eventPage = await getAdminEventLogPage(query, now);
  } catch (error) {
    if (!(error instanceof AdminEventLogSearchTooBroadError)) throw error;
  }
  const filters = eventPage?.filters ?? query;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Operational log</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            A 30-day, structured ledger of access outcomes, quota denials, and provider failures. It never contains raw prompts, codes, or provider errors.
          </p>
        </div>
        <nav aria-label="Admin sections" className="flex flex-wrap gap-3 text-sm font-medium">
          <Link href="/admin" className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Overview</Link>
          <Link href="/admin/users" className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Users</Link>
          <Link href="/admin/access-codes" className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Access codes</Link>
        </nav>
      </div>

      <AdminEventLogFilters
        key={adminEventLogHref(filters, filters.page)}
        filters={filters}
      />

      {eventPage ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {eventPage.total === 1 ? "1 event" : `${eventPage.total.toLocaleString("en-US")} events`}
              {eventPage.filters.q ? ` matching “${eventPage.filters.q}”` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <span>Retention cutoff: {formatUtc(eventPage.retentionCutoff)} UTC</span>
              {eventPage.pageCount > 1 && <span>Page {eventPage.page} of {eventPage.pageCount}</span>}
            </div>
          </div>

          {eventPage.events.length > 0 ? (
            <>
              <AdminEventLogTable events={eventPage.events} />
              {eventPage.pageCount > 1 && (
                <nav aria-label="Event log pagination" className="flex items-center justify-between gap-3">
                  {eventPage.page > 1 ? (
                    <Link href={adminEventLogHref(eventPage.filters, eventPage.page - 1)} className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]">Previous</Link>
                  ) : <span />}
                  {eventPage.page < eventPage.pageCount ? (
                    <Link href={adminEventLogHref(eventPage.filters, eventPage.page + 1)} className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]">Next</Link>
                  ) : <span />}
                </nav>
              )}
            </>
          ) : (
            <section className="rounded-xl border border-dashed border-black/[.2] p-8 text-center dark:border-white/[.25]" aria-labelledby="empty-events-heading">
              <h2 id="empty-events-heading" className="text-base font-semibold">No matching events</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Try a different filter, or return later when an approved operational outcome occurs.
              </p>
            </section>
          )}
        </>
      ) : (
        <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-8 text-center" aria-labelledby="broad-search-heading" role="status">
          <h2 id="broad-search-heading" className="text-base font-semibold">Search is too broad</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Use a more specific email address or identifier. No partial email matches were shown.
          </p>
          <Link href={adminEventLogHref({ ...filters, q: "", page: 1 }, 1)} className="mt-4 inline-flex text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Clear search</Link>
        </section>
      )}
    </main>
  );
}
