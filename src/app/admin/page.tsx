import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminOnlineNowTile } from "@/components/admin-online-now-tile";
import { AdminStatTile } from "@/components/admin-stat-tile";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { getAdminOverviewStats } from "@/lib/admin-overview";

function UsageCard({
  title,
  window,
  rows,
}: {
  title: string;
  window: string;
  rows: { label: string; value: number }[];
}) {
  return (
    <div className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{window}</span>
      </div>
      <dl className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-zinc-600 dark:text-zinc-400">{row.label}</dt>
            <dd className="text-lg font-semibold tracking-tight">{row.value.toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function AdminOverviewPage() {
  try {
    if (!(await getCurrentAdminUser())) notFound();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }

  const stats = await getAdminOverviewStats();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Registered users and live API usage across the app.
          </p>
        </div>
        <nav aria-label="Admin sections" className="flex flex-wrap gap-3 text-sm font-medium">
          <Link
            href="/admin/users"
            className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
          >
            Users
          </Link>
          <Link
            href="/admin/access-codes"
            className="text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
          >
            Access codes
          </Link>
        </nav>
      </div>

      <section aria-labelledby="registered-users-heading" className="flex flex-col gap-3">
        <h2 id="registered-users-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Registered users
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <AdminOnlineNowTile initialCount={stats.users.onlineNow} />
          <AdminStatTile label="Total" value={stats.users.total} />
          <AdminStatTile label="Activated" value={stats.users.activated} />
          <AdminStatTile label="Blocked" value={stats.users.blocked} />
          <AdminStatTile label="Admins" value={stats.users.admins} />
        </div>
      </section>

      <section aria-labelledby="access-codes-heading" className="flex flex-col gap-3">
        <h2 id="access-codes-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Access codes
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <AdminStatTile label="Generated" value={stats.accessCodes.total} />
          <AdminStatTile label="Redeemed" value={stats.accessCodes.redeemed} />
          <AdminStatTile label="Unredeemed" value={stats.accessCodes.unredeemed} />
        </div>
      </section>

      <section aria-labelledby="api-usage-heading" className="flex flex-col gap-3">
        <h2 id="api-usage-heading" className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          API usage
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UsageCard
            title="Translation"
            window="This month"
            rows={[
              { label: "Characters", value: stats.usage.translation.charactersThisMonth },
              { label: "Active users", value: stats.usage.translation.activeUsersThisMonth },
            ]}
          />
          <UsageCard
            title="Example generation"
            window="Today"
            rows={[
              { label: "Requests", value: stats.usage.examples.requestsToday },
              { label: "Active users", value: stats.usage.examples.activeUsersToday },
            ]}
          />
          <UsageCard
            title="Corrections"
            window="Today / this month"
            rows={[
              { label: "Requests today", value: stats.usage.corrections.requestsToday },
              { label: "Requests this month", value: stats.usage.corrections.requestsThisMonth },
              { label: "Active users today", value: stats.usage.corrections.activeUsersToday },
            ]}
          />
        </div>
      </section>
    </main>
  );
}
