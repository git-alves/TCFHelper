import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { editSupportResolutionNote, SUPPORT_RESOLUTION_NOTE_MAX_CHARS } from "@/lib/support-resolution";

const schema = z.object({ note: z.string().trim().min(1).max(SUPPORT_RESOLUTION_NOTE_MAX_CHARS) }).strict();
export async function PATCH(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  if (!(await getAdminApiUser())) return adminNotFoundResponse();
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminJsonResponse({ error: "Invalid request." }, 400);
  const outcome = await editSupportResolutionNote((await params).requestId, parsed.data.note.trim() || null);
  if (outcome.kind === "notFound") return adminNotFoundResponse();
  if (outcome.kind === "notEditable") return adminJsonResponse({ error: "The learner has already opened this reply, so it can't be edited" }, 409);
  return adminJsonResponse({ updated: true });
}
