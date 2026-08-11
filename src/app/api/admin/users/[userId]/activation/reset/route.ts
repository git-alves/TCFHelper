import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { resetAccessCodeActivation } from "@/lib/access-code";
import { prisma } from "@/lib/prisma";

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

/**
 * Detaches a learner's live access-code admission. It intentionally does not
 * revoke, delete, or unspend the code that admitted them: restoring access
 * requires a newly issued code.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const { userId } = await params;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });
  if (!target) return adminNotFoundResponse();

  // The sole owner is activation-exempt, so there is no code admission to
  // deactivate. This also prevents the owner from altering their own recovery
  // path through the dashboard.
  if (target.id === admin.id || target.isAdmin) {
    return adminJsonResponse(
      { error: "The owner account does not use an access code." },
      409,
    );
  }

  const result = await resetAccessCodeActivation(target.id);
  return adminJsonResponse({ activated: false, reset: result.kind === "reset" });
}
