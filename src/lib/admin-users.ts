import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DEFAULT_USER_QUOTA_LIMITS, type UserQuotaLimits } from "@/lib/user-quota-limits";

export const ADMIN_USERS_PAGE_SIZE = 25;
const MAX_ADMIN_USERS_SEARCH_LENGTH = 120;

const ADMIN_USER_QUOTA_OVERRIDE_SELECT = {
  translationRequestsPerMinute: true,
  translationCharactersPerMinute: true,
  translationCharactersPerMonth: true,
  exampleGenerationsPerDay: true,
  correctionRequestsPerDay: true,
} satisfies Prisma.UserQuotaOverrideSelect;

export const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  isAdmin: true,
  isBlocked: true,
  translationQuota: {
    select: {
      minuteStartedAt: true,
      minuteRequestCount: true,
      minuteCharacterCount: true,
      monthStartedAt: true,
      monthCharacterCount: true,
    },
  },
  exampleGenerationQuota: {
    select: {
      dayStartedAt: true,
      dailyRequestCount: true,
    },
  },
  correctionUsage: {
    select: {
      dayStartedAt: true,
      dailyRequestCount: true,
      monthStartedAt: true,
      monthlyRequestCount: true,
    },
  },
  quotaOverride: {
    select: ADMIN_USER_QUOTA_OVERRIDE_SELECT,
  },
  redeemedAccessCodes: {
    select: { redeemedAt: true },
    take: 1,
  },
} satisfies Prisma.UserSelect;

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof ADMIN_USER_SELECT }>;

export type AdminQuotaOverride = {
  -readonly [K in keyof UserQuotaLimits]: number | null;
};

export type AdminUserUsage = {
  translation: {
    currentMinuteRequests: number;
    currentMinuteCharacters: number;
    currentMonthCharacters: number;
  };
  examples: { currentDayRequests: number };
  corrections: { currentDayRequests: number; currentMonthRequests: number };
};

/** A date-only record is meaningful only while it is in its UTC window. */
function startsUtcMinute(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ),
  );
}

function startsUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startsUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function isSameWindow(left: Date, right: Date) {
  return left.getTime() === right.getTime();
}

export function serializeQuotaOverride(
  override: AdminUserRecord["quotaOverride"],
): AdminQuotaOverride {
  return {
    translationRequestsPerMinute: override?.translationRequestsPerMinute ?? null,
    translationCharactersPerMinute: override?.translationCharactersPerMinute ?? null,
    translationCharactersPerMonth: override?.translationCharactersPerMonth ?? null,
    exampleGenerationsPerDay: override?.exampleGenerationsPerDay ?? null,
    correctionRequestsPerDay: override?.correctionRequestsPerDay ?? null,
  };
}

export function getCurrentAdminUsage(record: Pick<
  AdminUserRecord,
  "translationQuota" | "exampleGenerationQuota" | "correctionUsage"
>, now = new Date()): AdminUserUsage {
  const translation = record.translationQuota;
  const examples = record.exampleGenerationQuota;
  const corrections = record.correctionUsage;

  const currentMinute = startsUtcMinute(now);
  const currentDay = startsUtcDay(now);
  const currentMonth = startsUtcMonth(now);

  return {
    translation: {
      currentMinuteRequests:
        translation && isSameWindow(translation.minuteStartedAt, currentMinute)
          ? translation.minuteRequestCount
          : 0,
      currentMinuteCharacters:
        translation && isSameWindow(translation.minuteStartedAt, currentMinute)
          ? translation.minuteCharacterCount
          : 0,
      currentMonthCharacters:
        translation && isSameWindow(translation.monthStartedAt, currentMonth)
          ? translation.monthCharacterCount
          : 0,
    },
    examples: {
      currentDayRequests:
        examples && isSameWindow(examples.dayStartedAt, currentDay) ? examples.dailyRequestCount : 0,
    },
    corrections: {
      currentDayRequests:
        corrections && isSameWindow(corrections.dayStartedAt, currentDay)
          ? corrections.dailyRequestCount
          : 0,
      currentMonthRequests:
        corrections && isSameWindow(corrections.monthStartedAt, currentMonth)
          ? corrections.monthlyRequestCount
          : 0,
    },
  };
}

export type AdminUserListItem = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  isAdmin: boolean;
  isBlocked: boolean;
  activatedAt: string | null;
  usage: AdminUserUsage;
};

export type AdminUserDetail = AdminUserListItem & {
  quotaOverride: AdminQuotaOverride;
  effectiveQuotaLimits: UserQuotaLimits;
};

function serializeUser(record: AdminUserRecord, now: Date): AdminUserListItem {
  return {
    id: record.id,
    email: record.email,
    name: record.name,
    createdAt: record.createdAt.toISOString(),
    isAdmin: record.isAdmin,
    isBlocked: record.isBlocked,
    activatedAt: record.redeemedAccessCodes[0]?.redeemedAt?.toISOString() ?? null,
    usage: getCurrentAdminUsage(record, now),
  };
}

export function serializeAdminUserDetail(record: AdminUserRecord, now = new Date()): AdminUserDetail {
  const quotaOverride = serializeQuotaOverride(record.quotaOverride);
  const effectiveQuotaLimits = {
    translationRequestsPerMinute:
      quotaOverride.translationRequestsPerMinute ?? DEFAULT_USER_QUOTA_LIMITS.translationRequestsPerMinute,
    translationCharactersPerMinute:
      quotaOverride.translationCharactersPerMinute ?? DEFAULT_USER_QUOTA_LIMITS.translationCharactersPerMinute,
    translationCharactersPerMonth:
      quotaOverride.translationCharactersPerMonth ?? DEFAULT_USER_QUOTA_LIMITS.translationCharactersPerMonth,
    exampleGenerationsPerDay:
      quotaOverride.exampleGenerationsPerDay ?? DEFAULT_USER_QUOTA_LIMITS.exampleGenerationsPerDay,
    correctionRequestsPerDay:
      quotaOverride.correctionRequestsPerDay ?? DEFAULT_USER_QUOTA_LIMITS.correctionRequestsPerDay,
  };

  return { ...serializeUser(record, now), quotaOverride, effectiveQuotaLimits };
}

export const ADMIN_USER_STATUS_FILTERS = ["all", "blocked", "admin", "activated", "unactivated"] as const;
export type AdminUserStatusFilter = (typeof ADMIN_USER_STATUS_FILTERS)[number];

function isAdminUserStatusFilter(value: string): value is AdminUserStatusFilter {
  return (ADMIN_USER_STATUS_FILTERS as readonly string[]).includes(value);
}

export function parseAdminUserListQuery(input: {
  query?: string | string[];
  status?: string | string[];
  page?: string | string[];
}) {
  const rawQuery = typeof input.query === "string" ? input.query : "";
  const query = rawQuery.trim().slice(0, MAX_ADMIN_USERS_SEARCH_LENGTH);
  const rawStatus = typeof input.status === "string" ? input.status : "all";
  const status: AdminUserStatusFilter = isAdminUserStatusFilter(rawStatus) ? rawStatus : "all";
  const rawPage = typeof input.page === "string" ? Number(input.page) : 1;
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  return { query, status, page };
}

function userSearchWhere(query: string): Prisma.UserWhereInput {
  if (!query) return {};

  return {
    OR: [
      { email: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
    ],
  };
}

/**
 * "Activated" mirrors the admin overview's own count query: a currently
 * live admission, not merely having redeemed a code at some point (a reset
 * learner's old code no longer relates to them once detached). The owner is
 * excluded from "unactivated" since they bypass activation entirely and
 * would otherwise always show as awaiting a code they will never redeem.
 */
function userStatusWhere(status: AdminUserStatusFilter): Prisma.UserWhereInput {
  switch (status) {
    case "blocked":
      return { isBlocked: true };
    case "admin":
      return { isAdmin: true };
    case "activated":
      return { redeemedAccessCodes: { some: { redeemedAt: { not: null } } } };
    case "unactivated":
      return { isAdmin: false, redeemedAccessCodes: { none: { redeemedAt: { not: null } } } };
    case "all":
      return {};
  }
}

export async function getAdminUsersPage({
  query,
  status,
  page,
}: {
  query: string;
  status: AdminUserStatusFilter;
  page: number;
}) {
  const where: Prisma.UserWhereInput = { ...userSearchWhere(query), ...userStatusWhere(status) };
  const total = await prisma.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_USERS_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const records = await prisma.user.findMany({
    where,
    select: ADMIN_USER_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * ADMIN_USERS_PAGE_SIZE,
    take: ADMIN_USERS_PAGE_SIZE,
  });
  const now = new Date();

  return {
    users: records.map((record) => serializeUser(record, now)),
    total,
    page: currentPage,
    pageCount,
    query,
    status,
  };
}

export async function getAdminUserDetail(userId: string) {
  const record = await prisma.user.findUnique({ where: { id: userId }, select: ADMIN_USER_SELECT });
  return record ? serializeAdminUserDetail(record) : null;
}

// A CSV export intentionally is not paginated -- it is "everything matching
// the current filters," not one page of it -- but still needs a hard upper
// bound so an unfiltered export on a runaway-large table cannot become an
// unbounded query.
const MAX_EXPORT_ROWS = 10_000;

export async function getAdminUsersForExport({
  query,
  status,
}: {
  query: string;
  status: AdminUserStatusFilter;
}): Promise<AdminUserListItem[]> {
  const where: Prisma.UserWhereInput = { ...userSearchWhere(query), ...userStatusWhere(status) };
  const records = await prisma.user.findMany({
    where,
    select: ADMIN_USER_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_EXPORT_ROWS,
  });
  const now = new Date();

  return records.map((record) => serializeUser(record, now));
}
