import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminSupportDeleteButton } from "@/components/admin-support-delete-button";
import { AdminSupportRetryButton } from "@/components/admin-support-retry-button";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { MAX_HUBSPOT_SYNC_ATTEMPTS } from "@/lib/support-hubspot-sync";

const CATEGORY_LABELS = {
  BUG: "Bug",
  QUESTION: "Question",
  FEATURE_REQUEST_FEEDBACK: "Feature request / feedback",
  ACCOUNT_ACCESS: "Account & access",
  OTHER: "Other",
} as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminSupportPage() {
  try {
    if (!(await getCurrentAdminUser())) notFound();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }

  // An inbox is intentionally bounded until the owner needs filtering or
  // pagination. The newest one hundred requests cover active triage without
  // turning an unbounded free-text ledger into an expensive admin render.
  const requests = await prisma.supportRequest.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      senderEmail: true,
      category: true,
      details: true,
      createdAt: true,
      hubspotTicketId: true,
      hubspotSyncedAt: true,
      hubspotSyncAttempts: true,
      hubspotLastSyncError: true,
      attachment: {
        select: { originalName: true, byteSize: true },
      },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Support requests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            The 100 most recent requests from learners.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-violet-700 underline underline-offset-4 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100"
        >
          Back to overview
        </Link>
      </div>

      {requests.length === 0 ? (
        <section className="rounded-xl border border-dashed border-black/[.15] px-5 py-10 text-center dark:border-white/[.2]">
          <h2 className="font-semibold">No support requests yet</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">New messages sent through Support will appear here.</p>
        </section>
      ) : (
        <ol className="flex flex-col gap-4" aria-label="Support requests">
          {requests.map((request) => (
            <li key={request.id} className="rounded-xl border border-black/[.1] p-5 dark:border-white/[.15]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{CATEGORY_LABELS[request.category]}</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{request.senderEmail}</p>
                </div>
                <time dateTime={request.createdAt.toISOString()} className="text-sm text-zinc-500 dark:text-zinc-400">
                  {formatDate(request.createdAt)}
                </time>
              </div>
              <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">{request.details}</p>
              {request.attachment && (
                <a
                  href={`/api/admin/support/${request.id}/attachment`}
                  className="mt-4 inline-flex max-w-full items-center gap-2 rounded-lg border border-black/[.12] px-3 py-2 text-sm text-violet-700 transition-colors hover:bg-violet-500/[.06] dark:border-white/[.18] dark:text-violet-300 dark:hover:bg-violet-300/[.08]"
                >
                  <span className="truncate">{request.attachment.originalName}</span>
                  <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                    ({Math.ceil(request.attachment.byteSize / 1024).toLocaleString("en-US")} KB)
                  </span>
                </a>
              )}
              {request.hubspotSyncedAt ? (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Synced to HubSpot (ticket {request.hubspotTicketId})
                </p>
              ) : (
                request.hubspotSyncAttempts > 0 && (
                  <>
                    <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                      Not yet in HubSpot after {request.hubspotSyncAttempts}{" "}
                      {request.hubspotSyncAttempts === 1 ? "attempt" : "attempts"}
                      {request.hubspotSyncAttempts >= MAX_HUBSPOT_SYNC_ATTEMPTS
                        ? " — retries stopped automatically."
                        : " — will retry automatically."}
                      {request.hubspotLastSyncError ? ` (${request.hubspotLastSyncError})` : ""}
                    </p>
                    <AdminSupportRetryButton requestId={request.id} />
                  </>
                )
              )}
              <AdminSupportDeleteButton requestId={request.id} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
