import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { editSupportResolutionNote, SUPPORT_RESOLUTION_NOTE_MAX_CHARS } from "@/lib/support-resolution";

const schema = z.object({ note: z.string().trim().min(1).max(SUPPORT_RESOLUTION_NOTE_MAX_CHARS) }).strict();

/**
 * Edits the reply on a resolved request the learner has not seen yet. Same
 * note rules as resolving, except that a reply cannot be cleared. Admin only;
 * anyone else gets the same 404 as the other admin routes.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  if (!(await getAdminApiUser())) return adminNotFoundResponse();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminJsonResponse({ error: "Invalid request." }, 400);

  const { requestId } = await params;
  const outcome = await editSupportResolutionNote(requestId, parsed.data.note);
  if (outcome.kind === "notFound") return adminNotFoundResponse();
  if (outcome.kind === "notEditable") {
    return adminJsonResponse(
      { error: "The learner has already opened this reply, or its notice has expired, so it can't be edited." },
      409,
    );
  }
  return adminJsonResponse({ updated: true });
}
