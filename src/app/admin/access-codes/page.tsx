import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAccessCodeGenerator } from "@/components/admin-access-code-generator";
import { AdminAccessCodesTable } from "@/components/admin-access-codes-table";
import { AdminExportCsvButton } from "@/components/admin-export-csv-button";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { getAdminAccessCodesPage, parseAdminAccessCodesListQuery } from "@/lib/admin-access-codes";

interface AdminAccessCodesPageProps {
  searchParams: Promise<{ query?: string | string[]; page?: string | string[] }>;
}

function pageHref(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("query", query);
  return `/admin/access-codes?${params.toString()}`;
}

function exportHref(query: string) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  const queryString = params.toString();
  return queryString ? `/api/admin/access-codes/export?${queryString}` : "/api/admin/access-codes/export";
}

export default async function AdminAccessCodesPage({ searchParams }: AdminAccessCodesPageProps) {
  try {
    if (!(await getCurrentAdminUser())) notFound();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }

  const filters = parseAdminAccessCodesListQuery(await searchParams);
  const codesPage = await getAdminAccessCodesPage(filters);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Access codes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Generate single-use codes and share them out of band. A learner redeems one at /activate before they can
            reach the workspace.
          </p>
        </div>
        <nav aria-label="Admin sections" className="flex flex-wrap gap-3 text-sm font-medium">
          <Link
            href="/admin"
            className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
          >
            Overview
          </Link>
          <Link
            href="/admin/users"
            className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
          >
            Users
          </Link>
          <Link
            href="/admin/logs"
            className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
          >
            Operational log
          </Link>
          <Link
            href="/admin/api-keys"
            className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
          >
            API Keys
          </Link>
        </nav>
      </div>

      <AdminAccessCodeGenerator />

      <form action="/admin/access-codes" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full max-w-md">
          <label htmlFor="access-code-search" className="block text-sm font-medium">
            Find a code
          </label>
          <input
            id="access-code-search"
            name="query"
            type="search"
            defaultValue={codesPage.query}
            placeholder="Code, note, or redeemer email"
            className="mt-2 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Search
        </button>
        {codesPage.query && (
          <Link
            href="/admin/access-codes"
            className="px-1 py-2 text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
          >
            Clear search
          </Link>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {codesPage.total === 1 ? "1 access code" : `${codesPage.total.toLocaleString("en-US")} access codes`}
          {codesPage.query ? ` matching "${codesPage.query}"` : ""}
        </p>
        <div className="flex items-center gap-3">
          {codesPage.pageCount > 1 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Page {codesPage.page} of {codesPage.pageCount}
            </p>
          )}
          <AdminExportCsvButton href={exportHref(codesPage.query)} />
        </div>
      </div>

      {codesPage.accessCodes.length > 0 ? (
        <>
          <AdminAccessCodesTable accessCodes={codesPage.accessCodes} />
          {codesPage.pageCount > 1 && (
            <nav aria-label="Access code pagination" className="flex items-center justify-between gap-3">
              {codesPage.page > 1 ? (
                <Link
                  href={pageHref(codesPage.query, codesPage.page - 1)}
                  className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}
              {codesPage.page < codesPage.pageCount ? (
                <Link
                  href={pageHref(codesPage.query, codesPage.page + 1)}
                  className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]"
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      ) : (
        <section
          className="rounded-xl border border-dashed border-black/[.2] p-8 text-center dark:border-white/[.25]"
          aria-labelledby="empty-access-codes-heading"
        >
          <h2 id="empty-access-codes-heading" className="text-base font-semibold">
            {codesPage.query ? "No matching codes" : "No access codes yet"}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {codesPage.query
              ? "Try a code, note, or redeemer email without extra filters."
              : "Generate one above to invite a learner."}
          </p>
        </section>
      )}
    </main>
  );
}
