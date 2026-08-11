import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import {
  createAccessCodes,
  getAdminAccessCodesPage,
  parseAdminAccessCodesListQuery,
} from "@/lib/admin-access-codes";
import { MAX_ACCESS_CODE_BATCH_SIZE, MAX_VALIDITY_DAYS } from "@/lib/access-code-limits";

const requestSchema = z
  .object({
    note: z.string().max(280).nullable().optional(),
    // Null/omitted means lifetime access once redeemed.
    validityDays: z.number().int().min(1).max(MAX_VALIDITY_DAYS).nullable().optional(),
    count: z.number().int().min(1).max(MAX_ACCESS_CODE_BATCH_SIZE).optional(),
  })
  .strict();

export async function GET(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const url = new URL(request.url);
  const filters = parseAdminAccessCodesListQuery({
    query: url.searchParams.get("query") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  return adminJsonResponse(await getAdminAccessCodesPage(filters));
}

export async function POST(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return adminJsonResponse({ error: "Invalid request." }, 400);
  }

  const accessCodes = await createAccessCodes(
    parsed.data.note ?? null,
    parsed.data.validityDays ?? null,
    parsed.data.count ?? 1,
  );
  return adminJsonResponse({ accessCodes }, 201);
}
