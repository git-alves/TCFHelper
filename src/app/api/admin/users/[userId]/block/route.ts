import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

const requestSchema = z.object({ isBlocked: z.boolean() }).strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return adminJsonResponse({ error: "Invalid request." }, 400);
  }

  const { userId } = await params;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });
  if (!target) return adminNotFoundResponse();

  // The only owner must never be able to remove their own access from the
  // same dashboard used to reverse it. The status is intentionally a normal
  // conflict response because only the verified owner can reach this route.
  if (parsed.data.isBlocked && (target.id === admin.id || target.isAdmin)) {
    return adminJsonResponse(
      { error: "The owner account cannot be blocked from this dashboard." },
      409,
    );
  }

  const user = await prisma.user.update({
    where: { id: target.id },
    data: { isBlocked: parsed.data.isBlocked },
    select: { id: true, isBlocked: true },
  });

  return adminJsonResponse({ user });
}
