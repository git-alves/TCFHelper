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

const OVERRIDE_FIELDS = [
  "translationRequestsPerMinute",
  "translationCharactersPerMinute",
  "translationCharactersPerMonth",
  "exampleGenerationsPerDay",
  "correctionRequestsPerDay",
] as const;

const QUOTA_TRANSACTION_TIMEOUT_MS = 3_000;

function allLimitsAreInherited(value: Record<(typeof OVERRIDE_FIELDS)[number], number | null>) {
  return OVERRIDE_FIELDS.every((field) => value[field] === null);
}

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
  const result = await prisma.$transaction(
    async (tx) => {
      // Translation and example reservations already lock the bare app CUID.
      // Correction usage currently has its own key, so take both in a stable
      // order. The override affects the *next* reservation without resetting
      // any counts, and cannot race a read-then-write reservation.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`correction-usage:${userId}`})::bigint)`;

      const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!target) return { kind: "missing" as const };

      const existing = await tx.userQuotaOverride.findUnique({
        where: { userId: target.id },
        select: OVERRIDE_SELECT,
      });
      const next = Object.fromEntries(
        OVERRIDE_FIELDS.map((field) => [
          field,
          Object.hasOwn(parsed.data, field) ? parsed.data[field] : existing?.[field] ?? null,
        ]),
      ) as Record<(typeof OVERRIDE_FIELDS)[number], number | null>;

      if (allLimitsAreInherited(next)) {
        await tx.userQuotaOverride.deleteMany({ where: { userId: target.id } });
        return { kind: "saved" as const, quotaOverride: null };
      }

      const quotaOverride = await tx.userQuotaOverride.upsert({
        where: { userId: target.id },
        create: { userId: target.id, ...next },
        update: next,
        select: OVERRIDE_SELECT,
      });
      return { kind: "saved" as const, quotaOverride };
    },
    { timeout: QUOTA_TRANSACTION_TIMEOUT_MS },
  );
  if (result.kind === "missing") return adminNotFoundResponse();

  return adminJsonResponse({ quotaOverride: serializeQuotaOverride(result.quotaOverride) });
}
