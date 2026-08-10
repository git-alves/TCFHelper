import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { createAccessCode, listAccessCodes } from "@/lib/admin-access-codes";

const requestSchema = z.object({ note: z.string().max(280).nullable().optional() }).strict();

export async function GET() {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  return adminJsonResponse({ accessCodes: await listAccessCodes() });
}

export async function POST(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return adminJsonResponse({ error: "Invalid request." }, 400);
  }

  const accessCode = await createAccessCode(parsed.data.note ?? null);
  return adminJsonResponse({ accessCode }, 201);
}
