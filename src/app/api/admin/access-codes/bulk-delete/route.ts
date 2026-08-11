import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { deleteAccessCodes } from "@/lib/admin-access-codes";
import { ADMIN_ACCESS_CODES_PAGE_SIZE } from "@/lib/access-code-limits";

const METHOD_NOT_ALLOWED_HEADERS = {
  Allow: "POST",
  "Cache-Control": "private, no-store",
};

// Next otherwise sends its automatic 405/OPTIONS response before the owner
// guard runs, which would disclose this owner-only endpoint to non-owners.
async function unsupportedMethod() {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  return new Response(null, { status: 405, headers: METHOD_NOT_ALLOWED_HEADERS });
}

export async function GET() {
  return unsupportedMethod();
}

export async function HEAD() {
  return unsupportedMethod();
}

export async function OPTIONS() {
  return unsupportedMethod();
}

export async function PUT() {
  return unsupportedMethod();
}

export async function PATCH() {
  return unsupportedMethod();
}

export async function DELETE() {
  return unsupportedMethod();
}

// Bounded to one page's worth: the UI only ever offers selection from
// whatever is currently rendered, which is never more than one page.
const requestSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(ADMIN_ACCESS_CODES_PAGE_SIZE),
  })
  .strict();

/**
 * Deletes every requested code that has no live admission, atomically per
 * deleteAccessCodes -- a code that changed state since the caller's page
 * load is silently excluded from the count rather than failing the batch.
 */
export async function POST(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return adminJsonResponse({ error: "Invalid request." }, 400);
  }

  const result = await deleteAccessCodes(parsed.data.ids);
  if ("timedOut" in result) {
    // The database itself canceled this statement, so its transaction
    // rolled back -- none of the selected codes were deleted, not merely
    // unconfirmed.
    return adminJsonResponse(
      { error: "This deletion could not be confirmed in time. None of the selected codes were deleted — please try again." },
      504,
    );
  }

  return adminJsonResponse(result);
}
