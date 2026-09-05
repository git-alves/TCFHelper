import "server-only";

import { Prisma } from "@prisma/client";
import {
  ADMIN_EVENT_BROWSER_FAMILIES,
  ADMIN_EVENT_DEVICE_CLASSES,
  ADMIN_EVENT_NETWORK_UNAVAILABLE,
  ADMIN_EVENT_MODULES,
  ADMIN_EVENT_PROVIDERS,
  ADMIN_EVENT_QUOTA_WINDOWS,
  ADMIN_EVENT_REASON_CODES,
  ADMIN_EVENT_SEVERITIES,
  ADMIN_EVENT_TYPES,
  formatAdminEventMessage,
  getAdminEventRetentionCutoff,
  type AdminEventModule,
  type AdminEventSeverity,
} from "@/lib/admin-events";
import { prisma } from "@/lib/prisma";

export const ADMIN_EVENT_LOG_RANGES = ["today", "last-7-days", "current-month", "custom"] as const;
export const ADMIN_EVENT_LOG_PAGE_SIZES = [20, 50, 100] as const;
export const ADMIN_EVENT_LOG_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_EVENT_LOG_MAX_QUERY_LENGTH = 120;
export const ADMIN_EVENT_LOG_MAX_PAGE = 1_000;
export const ADMIN_EVENT_LOG_MAX_CUSTOM_RANGE_DAYS = 30;
// The email lookup is a convenience bridge to immutable event userIds. It
// must remain bounded, but it must never quietly drop matching users.
export const ADMIN_EVENT_LOG_MAX_EMAIL_CANDIDATES = 100;

const ADMIN_EVENT_LOG_SEARCH_PARAM_KEYS = new Set([
  "range",
  "from",
  "to",
  "severity",
  "module",
  "q",
  "page",
  "limit",
]);

export type AdminEventLogRange = (typeof ADMIN_EVENT_LOG_RANGES)[number];
export type AdminEventLogPageSize = (typeof ADMIN_EVENT_LOG_PAGE_SIZES)[number];

export type AdminEventLogSearchParams = {
  range?: string | string[];
  from?: string | string[];
  to?: string | string[];
  severity?: string | string[];
  module?: string | string[];
  q?: string | string[];
  page?: string | string[];
  limit?: string | string[];
};

export type AdminEventLogFilterValues = {
  range: AdminEventLogRange;
  from: string | null;
  to: string | null;
  severity: AdminEventSeverity | null;
  module: AdminEventModule | null;
  q: string;
  page: number;
  limit: AdminEventLogPageSize;
};

export type AdminEventLogQuery = AdminEventLogFilterValues & {
  start: Date;
  end: Date;
};

export class AdminEventLogQueryError extends Error {
  constructor() {
    super("Invalid log query.");
    this.name = "AdminEventLogQueryError";
  }
}

/** A valid query whose email fragment would produce incomplete results. */
export class AdminEventLogSearchTooBroadError extends Error {
  constructor() {
    super("Search is too broad. Use a more specific email or identifier.");
    this.name = "AdminEventLogSearchTooBroadError";
  }
}

function hasValue<T extends readonly (string | number)[]>(
  values: T,
  value: string | number,
): value is T[number] {
  return values.includes(value);
}

function scalarParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) throw new AdminEventLogQueryError();
  return value?.trim() || undefined;
}

/**
 * Preserves duplicate parameters so the parser can reject an ambiguous URL
 * instead of accidentally selecting only its first value.
 */
export function adminEventLogSearchParamsFromUrl(params: URLSearchParams): AdminEventLogSearchParams {
  const values: AdminEventLogSearchParams = {};
  for (const key of new Set(params.keys())) {
    if (!ADMIN_EVENT_LOG_SEARCH_PARAM_KEYS.has(key)) throw new AdminEventLogQueryError();
    const entries = params.getAll(key);
    values[key as keyof AdminEventLogSearchParams] = entries.length === 1 ? entries[0] : entries;
  }
  return values;
}

function assertOnlyKnownParameters(input: AdminEventLogSearchParams) {
  for (const key of Object.keys(input)) {
    if (!ADMIN_EVENT_LOG_SEARCH_PARAM_KEYS.has(key)) throw new AdminEventLogQueryError();
  }
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * The custom-range form submits a `datetime-local` value explicitly labelled
 * UTC, while canonical pagination links use `toISOString()`. Accept just
 * those two UTC spellings; never let Date.parse choose a server-local zone.
 */
function parseUtcInstant(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z)?$/.exec(value);
  if (!match) throw new AdminEventLogQueryError();

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] ?? "0");
  const millisecond = Number((match[7] ?? "").padEnd(3, "0") || "0");
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second ||
    date.getUTCMilliseconds() !== millisecond
  ) {
    throw new AdminEventLogQueryError();
  }

  return date;
}

function parsePage(value: string | undefined) {
  if (!value) return 1;
  if (!/^[1-9]\d*$/.test(value)) throw new AdminEventLogQueryError();
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page > ADMIN_EVENT_LOG_MAX_PAGE) {
    throw new AdminEventLogQueryError();
  }
  return page;
}

function parsePageSize(value: string | undefined): AdminEventLogPageSize {
  if (!value) return ADMIN_EVENT_LOG_DEFAULT_PAGE_SIZE;
  const pageSize = Number(value);
  if (!hasValue(ADMIN_EVENT_LOG_PAGE_SIZES.map(String), value) || !hasValue(ADMIN_EVENT_LOG_PAGE_SIZES, pageSize)) {
    throw new AdminEventLogQueryError();
  }
  return pageSize;
}

/**
 * Parses only one well-defined URL shape. Invalid values are rejected instead
 * of being silently broadened into an owner-visible data query.
 */
export function parseAdminEventLogQuery(
  input: AdminEventLogSearchParams,
  now = new Date(),
): AdminEventLogQuery {
  assertOnlyKnownParameters(input);
  const rangeValue = scalarParam(input.range) ?? "today";
  if (!hasValue(ADMIN_EVENT_LOG_RANGES, rangeValue)) throw new AdminEventLogQueryError();

  const severityValue = scalarParam(input.severity);
  if (severityValue && severityValue !== "all" && !hasValue(ADMIN_EVENT_SEVERITIES, severityValue)) {
    throw new AdminEventLogQueryError();
  }
  const severity: AdminEventSeverity | null =
    severityValue && severityValue !== "all" ? (severityValue as AdminEventSeverity) : null;

  const moduleValue = scalarParam(input.module);
  if (moduleValue && moduleValue !== "all" && !hasValue(ADMIN_EVENT_MODULES, moduleValue)) {
    throw new AdminEventLogQueryError();
  }
  const eventModule: AdminEventModule | null =
    moduleValue && moduleValue !== "all" ? (moduleValue as AdminEventModule) : null;

  const q = (scalarParam(input.q) ?? "").replace(/\s+/g, " ");
  if (q.length > ADMIN_EVENT_LOG_MAX_QUERY_LENGTH) throw new AdminEventLogQueryError();

  const fromValue = scalarParam(input.from);
  const toValue = scalarParam(input.to);
  let start: Date;
  let end: Date;
  let from: string | null = null;
  let to: string | null = null;

  switch (rangeValue) {
    case "today":
      start = startOfUtcDay(now);
      end = now;
      break;
    case "last-7-days":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
      end = now;
      break;
    case "current-month":
      start = startOfUtcMonth(now);
      end = now;
      break;
    case "custom": {
      if (!fromValue || !toValue) throw new AdminEventLogQueryError();
      start = parseUtcInstant(fromValue);
      end = parseUtcInstant(toValue);
      const retentionCutoff = getAdminEventRetentionCutoff(now);
      if (
        end <= start ||
        end > now ||
        start < retentionCutoff ||
        end.getTime() - start.getTime() > ADMIN_EVENT_LOG_MAX_CUSTOM_RANGE_DAYS * 24 * 60 * 60 * 1_000
      ) {
        throw new AdminEventLogQueryError();
      }
      from = start.toISOString();
      to = end.toISOString();
      break;
    }
  }

  return {
    range: rangeValue,
    from,
    to,
    severity,
    module: eventModule,
    q,
    page: parsePage(scalarParam(input.page)),
    limit: parsePageSize(scalarParam(input.limit)),
    start,
    end,
  };
}

const ADMIN_EVENT_SELECT = {
  id: true,
  occurredAt: true,
  firstOccurredAt: true,
  severity: true,
  module: true,
  eventType: true,
  userId: true,
  essayId: true,
  accessCodeId: true,
  provider: true,
  reasonCode: true,
  httpStatus: true,
  quotaWindow: true,
  usageValue: true,
  quotaLimit: true,
  maskedIp: true,
  browserFamily: true,
  deviceClass: true,
  distinctIpCount: true,
  securityWindowMinutes: true,
  occurrenceCount: true,
} satisfies Prisma.AdminEventSelect;

type AdminEventRecord = Prisma.AdminEventGetPayload<{ select: typeof ADMIN_EVENT_SELECT }>;

const OPAQUE_ROW_ID_PATTERN = /^c[a-z0-9]{24}$/;
const UNKNOWN_EVENT_TYPE = "UNKNOWN_EVENT";
const UNKNOWN_EVENT_VALUE = "UNKNOWN";

function isKnownValue<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return (values as readonly string[]).includes(value);
}

function safeOpaqueId(value: string | null) {
  return value !== null && OPAQUE_ROW_ID_PATTERN.test(value) ? value : null;
}

function safeHttpStatus(value: number | null) {
  return value !== null && Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
}

function safeOccurrenceCount(value: number) {
  return Number.isSafeInteger(value) && value >= 1 ? value : 1;
}

function safeQuotaContext(record: AdminEventRecord) {
  const hasSafeWindow =
    record.quotaWindow !== null && isKnownValue(ADMIN_EVENT_QUOTA_WINDOWS, record.quotaWindow);
  const hasSafeCounts =
    record.usageValue !== null &&
    record.quotaLimit !== null &&
    Number.isSafeInteger(record.usageValue) &&
    Number.isSafeInteger(record.quotaLimit) &&
    record.usageValue >= 0 &&
    record.quotaLimit >= 0;

  if (!hasSafeWindow || !hasSafeCounts) {
    return { quotaWindow: null, usageValue: null, quotaLimit: null };
  }

  return {
    quotaWindow: record.quotaWindow,
    usageValue: record.usageValue,
    quotaLimit: record.quotaLimit,
  };
}

function safeMaskedIp(value: string | null) {
  return value !== null &&
    (value === ADMIN_EVENT_NETWORK_UNAVAILABLE ||
      /^(?:\d{1,3}\.){3}\*$/.test(value) ||
      /^[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f]{1,4}::\/48$/.test(value))
    ? value
    : null;
}

function safeBrowserFamily(value: string | null) {
  return value !== null && isKnownValue(ADMIN_EVENT_BROWSER_FAMILIES, value) ? value : null;
}

function safeDeviceClass(value: string | null) {
  return value !== null && isKnownValue(ADMIN_EVENT_DEVICE_CLASSES, value) ? value : null;
}

function safeReviewContext(record: AdminEventRecord) {
  if (record.eventType === "AUTH_SESSION_CREATED") {
    return {
      maskedIp: safeMaskedIp(record.maskedIp),
      browserFamily: safeBrowserFamily(record.browserFamily),
      deviceClass: safeDeviceClass(record.deviceClass),
      distinctIpCount: null,
      securityWindowMinutes: null,
    };
  }
  if (
    record.eventType === "AUTH_NETWORK_REVIEW_REQUIRED" &&
    record.distinctIpCount !== null &&
    Number.isSafeInteger(record.distinctIpCount) &&
    record.distinctIpCount >= 3 &&
    record.distinctIpCount <= 100 &&
    record.securityWindowMinutes === 10
  ) {
    return {
      maskedIp: null,
      browserFamily: null,
      deviceClass: null,
      distinctIpCount: record.distinctIpCount,
      securityWindowMinutes: record.securityWindowMinutes,
    };
  }
  return {
    maskedIp: null,
    browserFamily: null,
    deviceClass: null,
    distinctIpCount: null,
    securityWindowMinutes: null,
  };
}

export type AdminEventLogItem = {
  id: string;
  occurredAt: string;
  firstOccurredAt: string;
  severity: string;
  module: string;
  eventType: string;
  userId: string | null;
  essayId: string | null;
  accessCodeId: string | null;
  provider: string | null;
  reasonCode: string | null;
  httpStatus: number | null;
  quotaWindow: string | null;
  usageValue: number | null;
  quotaLimit: number | null;
  maskedIp?: string | null;
  browserFamily?: string | null;
  deviceClass?: string | null;
  distinctIpCount?: number | null;
  securityWindowMinutes?: number | null;
  occurrenceCount: number;
  message: string;
  userEmail?: string | null;
};

function serializeAdminEvent(record: AdminEventRecord, emailByUserId: ReadonlyMap<string, string>): AdminEventLogItem {
  const eventType = isKnownValue(ADMIN_EVENT_TYPES, record.eventType)
    ? record.eventType
    : UNKNOWN_EVENT_TYPE;
  const severity = isKnownValue(ADMIN_EVENT_SEVERITIES, record.severity)
    ? record.severity
    : UNKNOWN_EVENT_VALUE;
  const eventModule = isKnownValue(ADMIN_EVENT_MODULES, record.module)
    ? record.module
    : UNKNOWN_EVENT_VALUE;
  const provider =
    record.provider !== null && isKnownValue(ADMIN_EVENT_PROVIDERS, record.provider)
      ? record.provider
      : null;
  const reasonCode =
    record.reasonCode !== null && isKnownValue(ADMIN_EVENT_REASON_CODES, record.reasonCode)
      ? record.reasonCode
      : null;
  const quota = safeQuotaContext(record);
  const security = safeReviewContext(record);
  const occurrenceCount = safeOccurrenceCount(record.occurrenceCount);
  const messageInput = {
    eventType,
    provider,
    reasonCode,
    ...quota,
    distinctIpCount: security.distinctIpCount,
    securityWindowMinutes: security.securityWindowMinutes,
    occurrenceCount,
  };

  const userId = safeOpaqueId(record.userId);

  return {
    id: safeOpaqueId(record.id) ?? "unknown-event",
    occurredAt: record.occurredAt.toISOString(),
    firstOccurredAt: record.firstOccurredAt.toISOString(),
    severity,
    module: eventModule,
    eventType,
    userId,
    essayId: safeOpaqueId(record.essayId),
    accessCodeId: safeOpaqueId(record.accessCodeId),
    provider,
    reasonCode,
    httpStatus: safeHttpStatus(record.httpStatus),
    quotaWindow: quota.quotaWindow,
    usageValue: quota.usageValue,
    quotaLimit: quota.quotaLimit,
    maskedIp: security.maskedIp,
    browserFamily: security.browserFamily,
    deviceClass: security.deviceClass,
    distinctIpCount: security.distinctIpCount,
    securityWindowMinutes: security.securityWindowMinutes,
    occurrenceCount,
    message: formatAdminEventMessage(messageInput),
    // userId is an immutable event-time snapshot; the account it names can
    // be renamed, have its email changed, or be deleted since. A missing
    // lookup here means exactly that -- not that the event lacks a user --
    // so the table falls back to the raw id rather than hiding the row.
    userEmail: userId ? (emailByUserId.get(userId) ?? null) : null,
  };
}

async function matchingUserIds(query: string) {
  if (!query) return [];

  const users = await prisma.user.findMany({
    where: { email: { contains: query, mode: "insensitive" } },
    select: { id: true },
    take: ADMIN_EVENT_LOG_MAX_EMAIL_CANDIDATES + 1,
  });
  if (users.length > ADMIN_EVENT_LOG_MAX_EMAIL_CANDIDATES) {
    throw new AdminEventLogSearchTooBroadError();
  }
  return users.map((user) => user.id);
}

/**
 * The one page of events being rendered names only a handful of distinct
 * users at most, so this is a single small bounded lookup per page render --
 * never a per-row query.
 */
async function emailsForUserIds(userIds: string[]): Promise<Map<string, string>> {
  const distinctIds = [...new Set(userIds)];
  if (distinctIds.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: distinctIds } },
    select: { id: true, email: true },
  });
  return new Map(users.map((user) => [user.id, user.email]));
}

async function adminEventWhere(query: AdminEventLogQuery, now: Date): Promise<Prisma.AdminEventWhereInput> {
  const userIds = await matchingUserIds(query.q);
  const retentionCutoff = getAdminEventRetentionCutoff(now);
  const effectiveStart = query.start > retentionCutoff ? query.start : retentionCutoff;

  const where: Prisma.AdminEventWhereInput = {
    occurredAt: { gte: effectiveStart, lt: query.end },
  };
  if (query.severity) where.severity = query.severity;
  if (query.module) where.module = query.module;

  if (query.q) {
    where.OR = [
      { searchText: { contains: query.q, mode: "insensitive" } },
      { eventType: { contains: query.q, mode: "insensitive" } },
      { reasonCode: { contains: query.q, mode: "insensitive" } },
      { provider: { contains: query.q, mode: "insensitive" } },
      { userId: { contains: query.q, mode: "insensitive" } },
      { essayId: { contains: query.q, mode: "insensitive" } },
      { accessCodeId: { contains: query.q, mode: "insensitive" } },
      ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
    ];
  }

  return where;
}

export type AdminEventLogPage = {
  events: AdminEventLogItem[];
  total: number;
  page: number;
  pageCount: number;
  filters: AdminEventLogFilterValues;
  retentionCutoff: string;
};

/**
 * Lists only the bounded retention window. The reader deliberately returns a
 * rendered message and never exposes `searchText`, so a future UI cannot
 * accidentally treat it as a raw message blob.
 */
export async function getAdminEventLogPage(
  query: AdminEventLogQuery,
  now = new Date(),
): Promise<AdminEventLogPage> {
  const where = await adminEventWhere(query, now);
  const total = await prisma.adminEvent.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / query.limit));
  const page = Math.min(query.page, pageCount);
  const records = await prisma.adminEvent.findMany({
    where,
    select: ADMIN_EVENT_SELECT,
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * query.limit,
    take: query.limit,
  });
  const emailByUserId = await emailsForUserIds(
    records.map((record) => safeOpaqueId(record.userId)).filter((userId): userId is string => userId !== null),
  );

  return {
    events: records.map((record) => serializeAdminEvent(record, emailByUserId)),
    total,
    page,
    pageCount,
    filters: {
      range: query.range,
      from: query.from,
      to: query.to,
      severity: query.severity,
      module: query.module,
      q: query.q,
      page,
      limit: query.limit,
    },
    retentionCutoff: getAdminEventRetentionCutoff(now).toISOString(),
  };
}

/** Produces a canonical, complete link so pagination never drops a filter. */
export function adminEventLogHref(filters: AdminEventLogFilterValues, page: number) {
  const params = new URLSearchParams({
    range: filters.range,
    severity: filters.severity ?? "all",
    module: filters.module ?? "all",
    page: String(page),
    limit: String(filters.limit),
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.range === "custom" && filters.from && filters.to) {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  return `/admin/logs?${params.toString()}`;
}
