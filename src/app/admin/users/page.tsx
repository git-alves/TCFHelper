import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminUsersTable } from "@/components/admin-users-table";
import { AdminExportCsvButton } from "@/components/admin-export-csv-button";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import {
  type AdminUserStatusFilter,
  getAdminUsersPage,
  parseAdminUserListQuery,
} from "@/lib/admin-users";

interface AdminUsersPageProps {
  searchParams: Promise<{ query?: string | string[]; status?: string | string[]; page?: string | string[] }>;
}

const STATUS_FILTER_LABELS: Record<AdminUserStatusFilter, string> = {
  all: "All statuses",
  blocked: "Blocked",
  admin: "Admin",
  activated: "Activated",
  unactivated: "Unactivated",
};

function pageHref(query: string, status: AdminUserStatusFilter, page: number) {
  const params = new URLSearchParams({ status, page: String(page) });
  if (query) params.set("query", query);
  return `/admin/users?${params.toString()}`;
}

function exportHref(query: string, status: AdminUserStatusFilter) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (query) params.set("query", query);
  const queryString = params.toString();
  return queryString ? `/api/admin/users/export?${queryString}` : "/api/admin/users/export";
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  let admin;
  try {
    admin = await getCurrentAdminUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }
  if (!admin) notFound();

  const filters = parseAdminUserListQuery(await searchParams);
  const usersPage = await getAdminUsersPage(filters);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-7 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Users</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Search learner accounts, check their live quota windows, and open a profile to manage access or limits.
          </p>
        </div>
        <nav aria-label="Admin sections" className="flex flex-wrap gap-3 text-sm font-medium">
          <Link href="/admin" className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Overview</Link>
          <Link href="/admin/access-codes" className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Access codes</Link>
          <Link href="/admin/logs" className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Operational log</Link>
        </nav>
      </div>

      <form action="/admin/users" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full max-w-md">
          <label htmlFor="user-search" className="block text-sm font-medium">Find a learner</label>
          <input
            id="user-search"
            name="query"
            type="search"
            defaultValue={usersPage.query}
            placeholder="Name or email"
            className="mt-2 w-full rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          />
        </div>
        <div>
          <label htmlFor="user-status" className="block text-sm font-medium">Status</label>
          <select
            id="user-status"
            name="status"
            defaultValue={usersPage.status}
            className="mt-2 rounded-lg border border-black/[.15] bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25 dark:border-white/[.2]"
          >
            {Object.entries(STATUS_FILTER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="page" value="1" />
        <button type="submit" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]">Apply</button>
        {(usersPage.query || usersPage.status !== "all") && (
          <Link href="/admin/users" className="px-1 py-2 text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Clear filters</Link>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {usersPage.total === 1 ? "1 registered user" : `${usersPage.total.toLocaleString("en-US")} registered users`}
          {usersPage.status !== "all" ? ` (${STATUS_FILTER_LABELS[usersPage.status].toLowerCase()})` : ""}
          {usersPage.query ? ` matching “${usersPage.query}”` : ""}
        </p>
        <div className="flex items-center gap-3">
          {usersPage.pageCount > 1 && <p className="text-sm text-zinc-600 dark:text-zinc-400">Page {usersPage.page} of {usersPage.pageCount}</p>}
          <AdminExportCsvButton href={exportHref(usersPage.query, usersPage.status)} />
        </div>
      </div>

      {usersPage.users.length > 0 ? (
        <>
          <AdminUsersTable users={usersPage.users} currentAdminId={admin.id} />
          {usersPage.pageCount > 1 && (
            <nav aria-label="User pagination" className="flex items-center justify-between gap-3">
              {usersPage.page > 1 ? (
                <Link href={pageHref(usersPage.query, usersPage.status, usersPage.page - 1)} className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]">Previous</Link>
              ) : <span />}
              {usersPage.page < usersPage.pageCount ? (
                <Link href={pageHref(usersPage.query, usersPage.status, usersPage.page + 1)} className="rounded-full border border-black/[.15] px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:hover:bg-white/[.06]">Next</Link>
              ) : <span />}
            </nav>
          )}
        </>
      ) : (
        <section className="rounded-xl border border-dashed border-black/[.2] p-8 text-center dark:border-white/[.25]" aria-labelledby="empty-users-heading">
          <h2 id="empty-users-heading" className="text-base font-semibold">
            {usersPage.query || usersPage.status !== "all" ? "No matching users" : "No registered users yet"}
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {usersPage.query || usersPage.status !== "all"
              ? "Try a different name, email, or status filter."
              : "Newly registered learners will appear here automatically."}
          </p>
        </section>
      )}
    </main>
  );
}
