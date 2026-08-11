import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { deleteAccessCode } from "@/lib/admin-access-codes";

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
 * Permanently deletes a code that has no live admission. A code currently
 * granting access is never deleted here -- that would sever the learner's
 * admission; deactivate it from the learner's detail page first.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ accessCodeId: string }> },
) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const { accessCodeId } = await params;
  const result = await deleteAccessCode(accessCodeId);

  if (result.kind === "notFound") return adminNotFoundResponse();
  if (result.kind === "activelyRedeemed") {
    return adminJsonResponse(
      { error: "This code is currently granting a learner access. Deactivate their admission first." },
      409,
    );
  }
  if (result.kind === "timedOut") {
    // The database itself canceled this statement (see
    // DELETE_STATEMENT_TIMEOUT_MS), so its transaction rolled back -- this
    // code was definitely not deleted, not merely unconfirmed.
    return adminJsonResponse(
      { error: "This deletion could not be confirmed in time. The code was not deleted — please try again." },
      504,
    );
  }

  return adminJsonResponse({ deleted: true });
}
