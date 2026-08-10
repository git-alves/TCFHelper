import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({ isAdmin: z.boolean() }).strict();

/**
 * This route makes the role policy explicit for API consumers. A single-owner
 * installation cannot safely treat a table toggle as ordinary user editing:
 * granting would create a second owner and revoking would lock out the only
 * one. Idempotent requests are harmless; ownership changes remain an
 * operational action until a separately-confirmed transfer flow exists.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return adminJsonResponse({ error: "Invalid request." }, 400);

  const { userId } = await params;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });
  if (!target) return adminNotFoundResponse();

  if (target.isAdmin === parsed.data.isAdmin) {
    return adminJsonResponse({ user: target });
  }

  return adminJsonResponse(
    { error: "Owner access is managed outside the dashboard." },
    409,
  );
}
