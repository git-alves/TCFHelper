import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { deleteSupportRequest } from "@/lib/admin-support";

const METHOD_NOT_ALLOWED_HEADERS = {
  Allow: "DELETE",
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

export async function POST() {
  return unsupportedMethod();
}

/**
 * Permanently deletes a support request and its attachment, so this ledger
 * does not grow without bound. The HubSpot mirror (if synced) is left
 * untouched -- it already lives outside this database.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const { requestId } = await params;
  const result = await deleteSupportRequest(requestId);

  if (result.kind === "notFound") return adminNotFoundResponse();
  if (result.kind === "timedOut") {
    // The database itself canceled this statement (see
    // DELETE_STATEMENT_TIMEOUT_MS), so its transaction rolled back -- this
    // request was definitely not deleted, not merely unconfirmed.
    return adminJsonResponse(
      { error: "This deletion could not be confirmed in time. The request was not deleted — please try again." },
      504,
    );
  }

  return adminJsonResponse({ deleted: true });
}
