import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accessCodeIsLiveWhere, resolveExpiresAt } from "@/lib/access-code-expiry";
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
    select: { redeemedAt: true, validityDays: true, expiresAt: true },
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
  // Distinct from `activatedAt` truthiness: a timed code past its derived
  // expiry leaves activatedAt set (it is still the true historical
  // redemption date) but is no longer a live admission until the learner's
  // next request lazily detaches it (see access-code.ts). A caller that
  // needs to know "does this account currently have access" -- e.g. the
  // table's status badge -- must use this field, not activatedAt.
  hasLiveAdmission: boolean;
  usage: AdminUserUsage;
};

export type AdminUserDetail = AdminUserListItem & {
  quotaOverride: AdminQuotaOverride;
  effectiveQuotaLimits: UserQuotaLimits;
};

function serializeUser(record: AdminUserRecord, now: Date): AdminUserListItem {
  const redemption = record.redeemedAccessCodes[0];
  // resolveExpiresAt's fallback keeps this badge correct even for a legacy
  // row whose expiresAt has not been self-healed yet (see access-code.ts) --
  // the display can apply the fallback per-row where the list/export
  // filter itself, for boundedness reasons, cannot; see
  // accessCodeIsLiveWhere for that side of the same rollout-safety story.
  const resolvedExpiresAt = redemption !== undefined ? resolveExpiresAt(redemption) : undefined;
  const hasLiveAdmission =
    resolvedExpiresAt !== undefined && (resolvedExpiresAt === null || resolvedExpiresAt.getTime() > now.getTime());

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    createdAt: record.createdAt.toISOString(),
    isAdmin: record.isAdmin,
    isBlocked: record.isBlocked,
    activatedAt: redemption?.redeemedAt?.toISOString() ?? null,
    hasLiveAdmission,
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

// A duplicated query-string key (?status=a&status=b) arrives as a string[]
// from a Next.js page's searchParams but is already collapsed to its first
// value by URLSearchParams#get before an API route calls this same parser.
// Taking the first element here too keeps both surfaces resolving a
// duplicated param identically instead of the page silently falling back to
// "all"/"" while the API honors the first value.
function firstParamValue(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

export function parseAdminUserListQuery(input: {
  query?: string | string[];
  status?: string | string[];
  page?: string | string[];
}) {
  const query = firstParamValue(input.query).trim().slice(0, MAX_ADMIN_USERS_SEARCH_LENGTH);
  const rawStatus = firstParamValue(input.status) || "all";
  const status: AdminUserStatusFilter = isAdminUserStatusFilter(rawStatus) ? rawStatus : "all";
  const rawPage = Number(firstParamValue(input.page) || "1");
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
 * A currently live admission means the relation has an attached row (a
 * detached/reset code no longer relates to the user at all, since
 * redeemedByUserId is what defines this relation) that accessCodeIsLiveWhere
 * considers live -- see there for what that means and, importantly, how it
 * stays correct across a mixed-version deploy that added the expiresAt
 * column. A timed code past its expiry is still attached until the
 * learner's own next request lazily detaches it (hasRedeemedAccessCode), so
 * a plain "redeemedAt is not null" filter would misclassify it as
 * indefinitely activated -- this is why expiresAt, not redeemedAt, is what
 * this filter compares.
 *
 * Because expiresAt is a real column (not date arithmetic computed ad hoc
 * per read), this is an ordinary Prisma relation filter: one query, the
 * same one already handling search and pagination, with no separate
 * unbounded id list built in application memory and no window between two
 * queries for a redemption/reset/expiry to land in and go unseen.
 */
function userStatusWhere(status: AdminUserStatusFilter, now: Date): Prisma.UserWhereInput {
  const isLive = accessCodeIsLiveWhere(now);

  switch (status) {
    case "blocked":
      return { isBlocked: true };
    case "admin":
      return { isAdmin: true };
    case "activated":
      return { redeemedAccessCodes: { some: isLive } };
    case "unactivated":
      return { isAdmin: false, redeemedAccessCodes: { none: isLive } };
    case "all":
      return {};
  }
}

export async function getAdminUsersPage(
  {
    query,
    status,
    page,
  }: {
    query: string;
    status: AdminUserStatusFilter;
    page: number;
  },
  now = new Date(),
) {
  const where: Prisma.UserWhereInput = { ...userSearchWhere(query), ...userStatusWhere(status, now) };
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
// unbounded query. Crucially, exceeding it must never silently produce a
// partial file: getAdminUsersForExport refuses instead (see
// AdminUsersExportResult), because a CSV that quietly omits records while
// claiming to be "the export" is worse than no export at all.
export const MAX_USERS_EXPORT_ROWS = 10_000;

export type AdminUsersExportResult =
  | { truncated: false; users: AdminUserListItem[] }
  | { truncated: true };

/**
 * A separate count() before this findMany would leave a window for a
 * matching user to be created in between -- the count could pass under the
 * cap while the findMany, racing behind it, silently omits the newly
 * matching row from an export that claims completeness. Requesting one row
 * past the cap in this single query sidesteps that race entirely: if it
 * comes back, the true total is unknowably over the cap and the caller must
 * refuse rather than guess; fewer than that and every row already in hand
 * is provably the whole set.
 */
export async function getAdminUsersForExport(
  {
    query,
    status,
  }: {
    query: string;
    status: AdminUserStatusFilter;
  },
  now = new Date(),
): Promise<AdminUsersExportResult> {
  const where: Prisma.UserWhereInput = { ...userSearchWhere(query), ...userStatusWhere(status, now) };
  const records = await prisma.user.findMany({
    where,
    select: ADMIN_USER_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_USERS_EXPORT_ROWS + 1,
  });

  if (records.length > MAX_USERS_EXPORT_ROWS) {
    return { truncated: true };
  }

  return { truncated: false, users: records.map((record) => serializeUser(record, now)) };
}
