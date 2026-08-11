import { AdminAccessCodeDeleteButton } from "@/components/admin-access-code-delete-button";
import { CopyButton } from "@/components/copy-button";
import type { AdminAccessCode } from "@/lib/admin-access-codes";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function validityLabel(validityDays: number | null) {
  return validityDays === null ? "Lifetime" : `${validityDays} day${validityDays === 1 ? "" : "s"}`;
}

/**
 * expiresAt is derived (redeemedAt + validityDays), not a stored flag, so a
 * timed code can read as expired here before the DB reflects it -- actual
 * detachment only happens lazily, on the learner's own next request. Naming
 * that gap explicitly keeps this table honest instead of implying the
 * learner still has live access.
 */
function statusText(accessCode: AdminAccessCode) {
  if (!accessCode.redeemedAt) return null;
  if (!accessCode.redeemedByUserEmail) {
    return `Permanently spent on ${formatDate(accessCode.redeemedAt)} — no active admission`;
  }
  if (accessCode.expiresAt && new Date(accessCode.expiresAt).getTime() <= Date.now()) {
    return `Redeemed by ${accessCode.redeemedByUserEmail} — expired ${formatDate(accessCode.expiresAt)}, access will be removed on their next visit`;
  }
  const redeemed = `Redeemed by ${accessCode.redeemedByUserEmail} on ${formatDate(accessCode.redeemedAt)}`;
  return accessCode.expiresAt ? `${redeemed} — expires ${formatDate(accessCode.expiresAt)}` : redeemed;
}

export function AdminAccessCodesTable({ accessCodes }: { accessCodes: AdminAccessCode[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/[.1] dark:border-white/[.15]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-black/[.1] text-xs font-medium text-zinc-500 dark:border-white/[.15] dark:text-zinc-400">
          <tr>
            <th scope="col" className="px-4 py-3">Code</th>
            <th scope="col" className="px-4 py-3">Note</th>
            <th scope="col" className="px-4 py-3">Validity</th>
            <th scope="col" className="px-4 py-3">Created</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[.08] dark:divide-white/[.1]">
          {accessCodes.map((accessCode) => {
            const status = statusText(accessCode);
            // Matches deleteAccessCode's own eligibility check: a code with
            // no active admission (never redeemed, or already detached) can
            // be deleted without affecting anyone's access.
            const isDeletable = accessCode.redeemedByUserEmail === null;
            return (
              <tr key={accessCode.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <code className="font-mono">{accessCode.code}</code>
                    <CopyButton value={accessCode.code} label={`Copy code ${accessCode.code}`} />
                  </div>
                </td>
                <td className="max-w-xs px-4 py-3 text-zinc-600 dark:text-zinc-400">{accessCode.note ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{validityLabel(accessCode.validityDays)}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{formatDate(accessCode.createdAt)}</td>
                <td className="px-4 py-3">
                  {status ? (
                    <span className="text-zinc-600 dark:text-zinc-400">{status}</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Unredeemed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isDeletable ? (
                    <AdminAccessCodeDeleteButton accessCodeId={accessCode.id} code={accessCode.code} />
                  ) : (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">In use</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
