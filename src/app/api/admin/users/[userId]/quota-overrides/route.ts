import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { serializeQuotaOverride } from "@/lib/admin-users";
import { prisma } from "@/lib/prisma";

const MAX_QUOTA_LIMIT = 1_000_000_000;
const nullableLimit = z.number().int().min(0).max(MAX_QUOTA_LIMIT).nullable();
const requestSchema = z
  .object({
    translationRequestsPerMinute: nullableLimit.optional(),
    translationCharactersPerMinute: nullableLimit.optional(),
    translationCharactersPerMonth: nullableLimit.optional(),
    exampleGenerationsPerDay: nullableLimit.optional(),
    correctionRequestsPerDay: nullableLimit.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one limit.");

const OVERRIDE_SELECT = {
  translationRequestsPerMinute: true,
  translationCharactersPerMinute: true,
  translationCharactersPerMonth: true,
  exampleGenerationsPerDay: true,
  correctionRequestsPerDay: true,
} as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return adminJsonResponse(
      { error: "Each quota limit must be a whole number from 0 to 1,000,000,000, or null." },
      400,
    );
  }

  const { userId } = await params;
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) return adminNotFoundResponse();

  const quotaOverride = await prisma.userQuotaOverride.upsert({
    where: { userId: target.id },
    create: { userId: target.id, ...parsed.data },
    update: parsed.data,
    select: OVERRIDE_SELECT,
  });

  return adminJsonResponse({ quotaOverride: serializeQuotaOverride(quotaOverride) });
}
