import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminAccessCodeGenerator } from "@/components/admin-access-code-generator";
import { AdminAccessCodesTable } from "@/components/admin-access-codes-table";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { listAccessCodes } from "@/lib/admin-access-codes";

export default async function AdminAccessCodesPage() {
  try {
    if (!(await getCurrentAdminUser())) notFound();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }

  const accessCodes = await listAccessCodes();

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
        </nav>
      </div>

      <AdminAccessCodeGenerator />

      {accessCodes.length > 0 ? (
        <AdminAccessCodesTable accessCodes={accessCodes} />
      ) : (
        <section
          className="rounded-xl border border-dashed border-black/[.2] p-8 text-center dark:border-white/[.25]"
          aria-labelledby="empty-access-codes-heading"
        >
          <h2 id="empty-access-codes-heading" className="text-base font-semibold">
            No access codes yet
          </h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Generate one above to invite a learner.</p>
        </section>
      )}
    </main>
  );
}
