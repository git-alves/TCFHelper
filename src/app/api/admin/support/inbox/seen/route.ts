import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { recordSupportInboxVisit } from "@/lib/support-inbox";

const seenSchema = z
  .object({
    // The page-render timestamp the browser is handing back. Optional: with
    // none, the visit is stamped with the server's current time.
    seenAt: z.iso.datetime().optional(),
  })
  .strict();

/**
 * The admin opened the support inbox: record it, so the bell and sidebar
 * badge stop counting what she has now seen. Deliberately a POST from the
 * page's client component after it mounted, not a write inside the page's
 * server render: a render can be run by a prefetch or a refresh without any
 * visit.
 *
 * Owner only (anyone else gets the usual admin 404). Idempotent, and a stale
 * `seenAt` can never move the stored time backwards or into the future (see
 * recordSupportInboxVisit).
 */
export async function POST(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  // An empty body is fine; anything else must be a valid one.
  const raw = await request.text();
  let body: unknown = {};
  if (raw.trim() !== "") {
    try {
      body = JSON.parse(raw);
    } catch {
      return adminJsonResponse({ error: "Invalid request." }, 400);
    }
  }
  const parsed = seenSchema.safeParse(body);
  if (!parsed.success) return adminJsonResponse({ error: "Invalid request." }, 400);

  const seenAt = await recordSupportInboxVisit(admin.id, parsed.data.seenAt ? new Date(parsed.data.seenAt) : null);
  return adminJsonResponse({ seenAt: seenAt.toISOString() });
}
