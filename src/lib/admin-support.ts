import "server-only";

import { withDeleteDeadline } from "@/lib/admin-delete-deadline";

export type DeleteSupportRequestResult = { kind: "deleted" } | { kind: "notFound" } | { kind: "timedOut" };

/**
 * Permanently removes a support request and its attachment (SupportAttachment
 * cascades on SupportRequest -- see schema.prisma), to keep this ledger from
 * growing without bound. Nothing else references SupportRequest, so nothing
 * else needs cleaning up: the HubSpot mirror (if any) is left as-is, since it
 * already lives outside this database.
 */
export async function deleteSupportRequest(id: string): Promise<DeleteSupportRequestResult> {
  const result = await withDeleteDeadline((tx) => tx.supportRequest.deleteMany({ where: { id } }));
  if (result.timedOut) return { kind: "timedOut" };
  return result.value.count > 0 ? { kind: "deleted" } : { kind: "notFound" };
}
