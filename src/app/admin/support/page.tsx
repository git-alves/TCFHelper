import { notFound } from "next/navigation";
import { AdminSupportDeleteButton } from "@/components/admin-support-delete-button";
import { AdminSupportInboxSeen } from "@/components/admin-support-inbox-count";
import { AdminSupportResolveButton } from "@/components/admin-support-resolve-button";
import { AdminSupportRetryButton } from "@/components/admin-support-retry-button";
import { AppUserProvisioningError, getCurrentAdminUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";
import { classifyNewTicket, getSupportInboxSeenAt } from "@/lib/support-inbox";
import { getSupportNoticeStatus, type SupportNoticeStatus } from "@/lib/support-notice-status";
import { MAX_HUBSPOT_SYNC_ATTEMPTS } from "@/lib/support-hubspot-sync";

const CATEGORY_LABELS = {
  BUG: "Bug",
  QUESTION: "Question",
  FEATURE_REQUEST_FEEDBACK: "Feature request / feedback",
  ACCOUNT_ACCESS: "Account & access",
  OTHER: "Other",
} as const;

const FEEDBACK_LABELS = {
  WORKED: "Worked",
  STILL_BROKEN: "Still has the problem",
} as const;

// One of four states per resolved ticket: answered (with what they said),
// not answered yet (still within the notice's 7 days), declined, or expired.
function describeNoticeStatus(status: SupportNoticeStatus | null) {
  if (!status) return "none";
  switch (status.kind) {
    case "answered":
      return `Answered: ${FEEDBACK_LABELS[status.feedback]} (${formatDate(status.at)})`;
    case "pending":
      return status.seenAt ? `Not answered yet (seen ${formatDate(status.seenAt)})` : "Not answered yet";
    case "declined":
      return `Declined to answer (${formatDate(status.at)})`;
    case "expired":
      return "No answer (expired)";
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminSupportPage() {
  let admin: Awaited<ReturnType<typeof getCurrentAdminUser>>;
  try {
    admin = await getCurrentAdminUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) notFound();
    throw error;
  }
  // Everything below is for the owner only.
  if (!admin) notFound();

  // This render only READS. It must stay free of writes: a render can be run
  // by a link prefetch or a router refresh with no visit behind it. The visit
  // is recorded by AdminSupportInboxSeen once this page has actually mounted
  // in the browser; the render time handed to it keeps a ticket that arrives
  // while this page renders counted as new. The previous visit decides which
  // tickets get the "New" tag below.
  const visitStartedAt = new Date();
  const previousSeenAt = await getSupportInboxSeenAt(admin.id);

  // An inbox is intentionally bounded until the owner needs filtering or
  // pagination. The newest one hundred requests cover active triage without
  // turning an unbounded free-text ledger into an expensive admin render.
  const requests = await prisma.supportRequest.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      ticketNumber: true,
      status: true,
      resolvedAt: true,
      resolutionNote: true,
      noticeSeenAt: true,
      noticeDismissedAt: true,
      resolutionFeedback: true,
      feedbackAt: true,
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
    <main className="flex w-full flex-1 flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <AdminSupportInboxSeen visitStartedAt={visitStartedAt.toISOString()} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Admin</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Support requests</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            The 100 most recent requests from learners.
          </p>
        </div>
      </div>

      {requests.length === 0 ? (
        <section className="rounded-xl border border-dashed border-black/[.15] px-5 py-10 text-center dark:border-white/[.2]">
          <h2 className="font-semibold">No support requests yet</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">New messages sent through Support will appear here.</p>
        </section>
      ) : (
        <ol className="flex flex-col gap-4" aria-label="Support requests">
          {requests.map((request) => {
            const newKind = classifyNewTicket(request, previousSeenAt);
            return (
              <li
                key={request.id}
                className={`rounded-xl border p-5 ${
                  newKind
                    ? "border-red-500/40 bg-red-500/[.04] dark:border-red-400/40"
                    : "border-black/[.1] dark:border-white/[.15]"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {newKind && (
                        <span
                          data-testid="ticket-new-tag"
                          className="mr-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white"
                        >
                          {newKind === "reopened" ? "Reopened" : "New"}
                        </span>
                      )}
                      <span data-testid="ticket-number">Ticket #{request.ticketNumber}</span>
                      <span className="text-zinc-400 dark:text-zinc-500"> · </span>
                      {CATEGORY_LABELS[request.category]}
                      <span
                        data-testid="ticket-status"
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                          request.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                            : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {request.status === "RESOLVED" ? "Resolved" : "Open"}
                      </span>
                    </p>
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
                {request.resolvedAt && (
                  <div data-testid="ticket-resolution" className="mt-4 rounded-lg bg-black/[.03] px-4 py-3 text-sm dark:bg-white/[.05]">
                    <p className="font-medium">
                      {request.status === "OPEN" ? "Reopened — earlier resolution" : "Resolved"}{" "}
                      <time dateTime={request.resolvedAt.toISOString()} className="font-normal text-zinc-500 dark:text-zinc-400">
                        {formatDate(request.resolvedAt)}
                      </time>
                    </p>
                    {request.resolutionNote && (
                      <p className="mt-1 whitespace-pre-wrap break-words text-zinc-700 dark:text-zinc-300">
                        Note: {request.resolutionNote}
                      </p>
                    )}
                    <p data-testid="ticket-learner-response" className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Learner response: {describeNoticeStatus(getSupportNoticeStatus(request, visitStartedAt))}
                    </p>
                  </div>
                )}
                {request.status === "OPEN" && (
                  <AdminSupportResolveButton requestId={request.id} ticketNumber={request.ticketNumber} />
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
                <AdminSupportDeleteButton requestId={request.id} isSyncedToHubspot={Boolean(request.hubspotSyncedAt)} />
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
