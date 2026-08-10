import Link from "next/link";
import { AdminUserAccountStatus } from "@/components/admin-user-account-status";
import type { AdminUserListItem } from "@/lib/admin-users";

interface AdminUsersTableProps {
  users: AdminUserListItem[];
  currentAdminId: string;
}

function formattedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function count(value: number) {
  return value.toLocaleString("en-US");
}

export function AdminUsersTable({ users, currentAdminId }: AdminUsersTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/[.1] dark:border-white/[.15]">
      <table className="min-w-[900px] w-full border-collapse text-left text-sm">
        <caption className="sr-only">Registered learners and their current usage</caption>
        <thead className="border-b border-black/[.1] bg-black/[.025] text-xs uppercase tracking-wide text-zinc-600 dark:border-white/[.15] dark:bg-white/[.04] dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">Learner</th>
            <th scope="col" className="px-4 py-3 font-medium">Joined</th>
            <th scope="col" className="px-4 py-3 font-medium">Access</th>
            <th scope="col" className="px-4 py-3 font-medium">Current usage</th>
            <th scope="col" className="px-4 py-3 font-medium"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[.08] dark:divide-white/[.12]">
          {users.map((user) => {
            const currentAdmin = user.id === currentAdminId;
            return (
              <tr key={user.id} className="align-top">
                <td className="px-4 py-4">
                  <Link href={`/admin/users/${user.id}`} className="font-medium underline underline-offset-4 hover:text-violet-700 dark:hover:text-violet-300">
                    {user.name ?? user.email}
                  </Link>
                  {user.name && <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{user.email}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {user.isAdmin && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">Owner</span>}
                    {user.isBlocked ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-200">Blocked</span>
                    ) : user.isAdmin ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">Owner access</span>
                    ) : user.activatedAt ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">Activated</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">Needs code</span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-zinc-600 dark:text-zinc-400">{formattedDate(user.createdAt)}</td>
                <td className="px-4 py-4">
                  <AdminUserAccountStatus
                    userId={user.id}
                    email={user.email}
                    isBlocked={user.isBlocked}
                    isCurrentAdmin={currentAdmin}
                    compact
                  />
                </td>
                <td className="px-4 py-4 text-xs leading-5 text-zinc-700 dark:text-zinc-300">
                  <p>Translation: {count(user.usage.translation.currentMonthCharacters)} chars this month</p>
                  <p>Examples: {count(user.usage.examples.currentDayRequests)} today</p>
                  <p>Corrections: {count(user.usage.corrections.currentDayRequests)} today</p>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Link href={`/admin/users/${user.id}`} className="text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">
                    Manage
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
