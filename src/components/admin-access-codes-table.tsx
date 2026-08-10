import { CopyButton } from "@/components/copy-button";
import type { AdminAccessCode } from "@/lib/admin-access-codes";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function AdminAccessCodesTable({ accessCodes }: { accessCodes: AdminAccessCode[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/[.1] dark:border-white/[.15]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-black/[.1] text-xs font-medium text-zinc-500 dark:border-white/[.15] dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">Code</th>
            <th scope="col" className="px-4 py-3">Note</th>
            <th scope="col" className="px-4 py-3">Created</th>
            <th scope="col" className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[.08] dark:divide-white/[.1]">
          {accessCodes.map((accessCode) => (
            <tr key={accessCode.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <code className="font-mono">{accessCode.code}</code>
                  <CopyButton value={accessCode.code} label={`Copy code ${accessCode.code}`} />
                </div>
              </td>
              <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-400">{accessCode.note ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDate(accessCode.createdAt)}</td>
              <td className="px-4 py-3">
                {accessCode.redeemedAt ? (
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Redeemed by {accessCode.redeemedByUserEmail ?? "a deleted account"} on{" "}
                    {formatDate(accessCode.redeemedAt)}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Unredeemed
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
