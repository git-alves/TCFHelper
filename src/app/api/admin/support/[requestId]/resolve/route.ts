import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { SUPPORT_RESOLUTION_NOTE_MAX_CHARS, resolveSupportRequest } from "@/lib/support-resolution";

const resolveSchema = z
  .object({
    // Optional, short, and shown to the learner. Blank is the same as none.
    note: z.string().max(SUPPORT_RESOLUTION_NOTE_MAX_CHARS).optional(),
  })
  .strict();

/**
 * Marks an OPEN support request resolved, with an optional note the learner
 * will see. Owner only (anyone else gets the same 404 as every admin route).
 * Not reversible from the admin panel: only the learner can reopen a ticket,
 * by answering the notice with STILL_BROKEN. HubSpot is not touched.
 */
export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  // An empty body is fine (no note); anything else must be a valid one.
  const raw = await request.text();
  let body: unknown = {};
  if (raw.trim() !== "") {
    try {
      body = JSON.parse(raw);
    } catch {
      return adminJsonResponse({ error: "Invalid request." }, 400);
    }
  }
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) return adminJsonResponse({ error: "Invalid request." }, 400);

  const note = parsed.data.note?.trim() || null;
  const { requestId } = await params;
  const outcome = await resolveSupportRequest(requestId, note);

  if (outcome.kind === "notFound") return adminNotFoundResponse();
  if (outcome.kind === "alreadyResolved") {
    return adminJsonResponse(
      { error: "This request is already resolved.", code: "SUPPORT_REQUEST_ALREADY_RESOLVED" },
      409,
    );
  }
  return adminJsonResponse({ resolved: true, ticketNumber: outcome.ticketNumber });
}
