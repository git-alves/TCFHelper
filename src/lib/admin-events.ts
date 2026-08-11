import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * The owner-facing event ledger is a bounded operational aid, not a raw
 * application-log mirror. These are intentionally strings rather than Prisma
 * enums, but both the runtime writer and database checks enforce the current
 * closed vocabulary. Extending it requires a reviewed code and migration
 * change rather than an ad-hoc string at a call site.
 */
export const ADMIN_EVENT_SEVERITIES = ["INFO", "WARN", "ERROR"] as const;
export const ADMIN_EVENT_MODULES = [
  "ESSAY_SERVICE",
  "QUOTA_ACCESS",
  "AUTH_SECURITY",
  "SYSTEM_INTEGRATION",
] as const;
export const ADMIN_EVENT_TYPES = [
  "ACCESS_CODE_REDEEMED",
  "ACCESS_CODE_REJECTED",
  "TRANSLATION_QUOTA_DENIED",
  "EXAMPLE_QUOTA_DENIED",
  "CORRECTION_QUOTA_DENIED",
  "CORRECTION_PROVIDER_FAILED",
  "EXAMPLE_PROVIDER_FAILED",
  "TRANSLATION_PROVIDER_FAILED",
] as const;
export const ADMIN_EVENT_REASON_CODES = [
  "invalid_or_spent",
  "minute_request_limit",
  "minute_character_limit",
  "monthly_character_limit",
  "daily_limit",
  "cooldown",
  "not_configured",
  "rate_limited",
  "transport_error",
  "upstream_http_error",
  "invalid_response",
  "fallback_circuit_open",
  "provider_unavailable",
] as const;
export const ADMIN_EVENT_PROVIDERS = ["gemini", "deepl", "unofficial", "deepl_or_unofficial"] as const;
export const ADMIN_EVENT_QUOTA_WINDOWS = ["minute", "day", "month"] as const;

export type AdminEventSeverity = (typeof ADMIN_EVENT_SEVERITIES)[number];
export type AdminEventModule = (typeof ADMIN_EVENT_MODULES)[number];
export type AdminEventType = (typeof ADMIN_EVENT_TYPES)[number];
export type AdminEventReasonCode = (typeof ADMIN_EVENT_REASON_CODES)[number];
export type AdminEventProvider = (typeof ADMIN_EVENT_PROVIDERS)[number];
export type AdminEventQuotaWindow = (typeof ADMIN_EVENT_QUOTA_WINDOWS)[number];

export const ADMIN_EVENT_RETENTION_DAYS = 30;
/** Best-effort logging may never materially delay the learner's response. */
export const ADMIN_EVENT_WRITE_TIMEOUT_MS = 250;
/** Allows ordinary clock skew but rejects timestamps that evade retention. */
export const ADMIN_EVENT_MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60_000;

type EventDefinition = {
  severity: AdminEventSeverity;
  module: AdminEventModule;
  searchText: string;
  /** Coalescing prevents user-controlled retry loops from amplifying writes. */
  coalesceForMs?: number;
};

const EVENT_DEFINITIONS: Record<AdminEventType, EventDefinition> = {
  ACCESS_CODE_REDEEMED: {
    severity: "INFO",
    module: "QUOTA_ACCESS",
    searchText: "access code voucher activation redeemed success",
  },
  ACCESS_CODE_REJECTED: {
    severity: "WARN",
    module: "QUOTA_ACCESS",
    searchText: "access code voucher activation rejected invalid spent",
    coalesceForMs: 15 * 60_000,
  },
  TRANSLATION_QUOTA_DENIED: {
    severity: "WARN",
    module: "QUOTA_ACCESS",
    searchText: "translation quota rate limit denied",
    coalesceForMs: 5 * 60_000,
  },
  EXAMPLE_QUOTA_DENIED: {
    severity: "WARN",
    module: "QUOTA_ACCESS",
    searchText: "example sample text generation quota rate limit denied",
    coalesceForMs: 5 * 60_000,
  },
  CORRECTION_QUOTA_DENIED: {
    severity: "WARN",
    module: "QUOTA_ACCESS",
    searchText: "essay correction quota daily limit denied",
    coalesceForMs: 5 * 60_000,
  },
  CORRECTION_PROVIDER_FAILED: {
    severity: "ERROR",
    module: "ESSAY_SERVICE",
    searchText: "essay correction generation provider ai failed",
    coalesceForMs: 15 * 60_000,
  },
  EXAMPLE_PROVIDER_FAILED: {
    severity: "ERROR",
    module: "ESSAY_SERVICE",
    searchText: "sample text example generation provider ai failed",
    coalesceForMs: 15 * 60_000,
  },
  TRANSLATION_PROVIDER_FAILED: {
    severity: "ERROR",
    module: "ESSAY_SERVICE",
    searchText: "translation generation provider failed",
    coalesceForMs: 15 * 60_000,
  },
};

/**
 * These fields intentionally exclude free-form text and JSON. Their values
 * are closed strings supplied by route-level classifiers, never by a request
 * body or upstream error. `accessCodeId` is the internal row id, never the
 * bearer code itself.
 */
export type AdminEventInput = {
  eventType: AdminEventType;
  userId?: string;
  essayId?: string;
  accessCodeId?: string;
  provider?: AdminEventProvider;
  reasonCode?: AdminEventReasonCode;
  httpStatus?: number;
  quotaWindow?: AdminEventQuotaWindow;
  usageValue?: number;
  quotaLimit?: number;
};

const ADMIN_EVENT_INPUT_KEYS = new Set<keyof AdminEventInput>([
  "eventType",
  "userId",
  "essayId",
  "accessCodeId",
  "provider",
  "reasonCode",
  "httpStatus",
  "quotaWindow",
  "usageValue",
  "quotaLimit",
]);

/** All referenced product rows use Prisma's opaque CUID format. */
const OPAQUE_ROW_ID_PATTERN = /^c[a-z0-9]{24}$/;

function isMember<const Values extends readonly string[]>(values: Values, value: unknown): value is Values[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function isOptionalOpaqueRowId(value: unknown): value is string | undefined {
  return value === undefined || (typeof value === "string" && OPAQUE_ROW_ID_PATTERN.test(value));
}

function isOptionalSafeCount(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
}

function isOptionalHttpStatus(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599);
}

function hasNoQuotaSnapshot(input: AdminEventInput) {
  return input.quotaWindow === undefined && input.usageValue === undefined && input.quotaLimit === undefined;
}

function hasQuotaSnapshot(input: AdminEventInput, quotaWindow: AdminEventQuotaWindow) {
  return (
    input.quotaWindow === quotaWindow &&
    input.usageValue !== undefined &&
    input.quotaLimit !== undefined
  );
}

function isEventFieldCombinationValid(input: AdminEventInput) {
  if (!input.userId || input.httpStatus === undefined) return false;

  switch (input.eventType) {
    case "ACCESS_CODE_REDEEMED":
      return (
        input.accessCodeId !== undefined &&
        input.httpStatus === 200 &&
        input.provider === undefined &&
        input.reasonCode === undefined &&
        hasNoQuotaSnapshot(input)
      );
    case "ACCESS_CODE_REJECTED":
      return (
        input.accessCodeId === undefined &&
        input.httpStatus === 400 &&
        input.provider === undefined &&
        input.reasonCode === "invalid_or_spent" &&
        hasNoQuotaSnapshot(input)
      );
    case "TRANSLATION_QUOTA_DENIED":
      return (
        input.httpStatus === 429 &&
        input.provider === undefined &&
        (
          ((input.reasonCode === "minute_request_limit" || input.reasonCode === "minute_character_limit") &&
            hasQuotaSnapshot(input, "minute")) ||
          (input.reasonCode === "monthly_character_limit" && hasQuotaSnapshot(input, "month"))
        )
      );
    case "EXAMPLE_QUOTA_DENIED":
      return (
        input.httpStatus === 429 &&
        input.provider === undefined &&
        ((input.reasonCode === "cooldown" && hasNoQuotaSnapshot(input)) ||
          (input.reasonCode === "daily_limit" && hasQuotaSnapshot(input, "day")))
      );
    case "CORRECTION_QUOTA_DENIED":
      return (
        input.httpStatus === 429 &&
        input.provider === undefined &&
        input.reasonCode === "daily_limit" &&
        hasQuotaSnapshot(input, "day")
      );
    case "CORRECTION_PROVIDER_FAILED":
    case "EXAMPLE_PROVIDER_FAILED":
      return (
        input.provider === "gemini" &&
        hasNoQuotaSnapshot(input) &&
        input.reasonCode !== undefined &&
        isMember(
          [
            "not_configured",
            "rate_limited",
            "transport_error",
            "upstream_http_error",
            "invalid_response",
            "provider_unavailable",
          ] as const,
          input.reasonCode,
        )
      );
    case "TRANSLATION_PROVIDER_FAILED":
      return (
        input.provider !== undefined &&
        hasNoQuotaSnapshot(input) &&
        input.reasonCode !== undefined &&
        isMember(["fallback_circuit_open", "transport_error", "provider_unavailable"] as const, input.reasonCode)
      );
  }
}

/**
 * The writer is the final safety boundary. Its callers are typed, but this
 * runtime check makes a cast or future unreviewed call harmless: arbitrary
 * text, providers, reasons, statuses, and extra payload fields are rejected
 * before a row can be persisted.
 */
function isValidAdminEventInput(input: unknown): input is AdminEventInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return false;
  }

  const candidate = input as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !ADMIN_EVENT_INPUT_KEYS.has(key as keyof AdminEventInput))) {
    return false;
  }

  const hasCompleteQuotaSnapshot =
    (candidate.usageValue === undefined && candidate.quotaLimit === undefined) ||
    (candidate.usageValue !== undefined && candidate.quotaLimit !== undefined);

  return (
    isMember(ADMIN_EVENT_TYPES, candidate.eventType) &&
    isOptionalOpaqueRowId(candidate.userId) &&
    isOptionalOpaqueRowId(candidate.essayId) &&
    isOptionalOpaqueRowId(candidate.accessCodeId) &&
    (candidate.provider === undefined || isMember(ADMIN_EVENT_PROVIDERS, candidate.provider)) &&
    (candidate.reasonCode === undefined || isMember(ADMIN_EVENT_REASON_CODES, candidate.reasonCode)) &&
    isOptionalHttpStatus(candidate.httpStatus) &&
    (candidate.quotaWindow === undefined || isMember(ADMIN_EVENT_QUOTA_WINDOWS, candidate.quotaWindow)) &&
    hasCompleteQuotaSnapshot &&
    isOptionalSafeCount(candidate.usageValue) &&
    isOptionalSafeCount(candidate.quotaLimit) &&
    isEventFieldCombinationValid(candidate as AdminEventInput)
  );
}

/**
 * Read every possible input property once into a plain, frozen object before
 * validation. That closes the gap where a getter or Proxy could return a
 * benign value during validation and a raw error/code during persistence.
 */
function snapshotAdminEventInput(input: unknown): Readonly<AdminEventInput> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;

  try {
    const candidate = input as Record<string, unknown>;
    if (Object.keys(candidate).some((key) => !ADMIN_EVENT_INPUT_KEYS.has(key as keyof AdminEventInput))) {
      return null;
    }

    const snapshot = {
      eventType: candidate.eventType,
      userId: candidate.userId,
      essayId: candidate.essayId,
      accessCodeId: candidate.accessCodeId,
      provider: candidate.provider,
      reasonCode: candidate.reasonCode,
      httpStatus: candidate.httpStatus,
      quotaWindow: candidate.quotaWindow,
      usageValue: candidate.usageValue,
      quotaLimit: candidate.quotaLimit,
    };
    if (!isValidAdminEventInput(snapshot)) return null;

    return Object.freeze(snapshot);
  } catch {
    return null;
  }
}

function snapshotEventTime(now: unknown): Date | null {
  try {
    if (!(now instanceof Date)) return null;

    const timestamp = now.getTime();
    if (
      !Number.isFinite(timestamp) ||
      timestamp > Date.now() + ADMIN_EVENT_MAX_FUTURE_CLOCK_SKEW_MS
    ) {
      return null;
    }
    return new Date(timestamp);
  } catch {
    return null;
  }
}

function dedupeKeyFor(input: AdminEventInput, now: Date, windowMs: number) {
  const bucket = Math.floor(now.getTime() / windowMs);
  // The values are all server-owned, but hash anyway so the unique key does
  // not become another place that exposes local user identifiers in raw form.
  return createHash("sha256")
    .update(
      [
        input.eventType,
        input.userId ?? "",
        input.essayId ?? "",
        input.accessCodeId ?? "",
        input.provider ?? "",
        input.reasonCode ?? "",
        String(input.httpStatus ?? ""),
        input.quotaWindow ?? "",
        String(input.usageValue ?? ""),
        String(input.quotaLimit ?? ""),
        String(bucket),
      ].join("\u0000"),
      "utf8",
    )
    .digest("hex");
}

type AdminEventWriteOutcome = "completed" | "failed" | "timed_out";

/**
 * Settles promptly when Postgres is slow or unavailable. The rejection
 * handler is attached immediately, so a write that rejects after the timeout
 * cannot become an unhandled rejection.
 */
async function awaitAdminEventWrite(write: Promise<unknown>): Promise<AdminEventWriteOutcome> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const settled: Promise<AdminEventWriteOutcome> = write.then(
    () => "completed" as const,
    () => "failed" as const,
  );
  const timeout = new Promise<AdminEventWriteOutcome>((resolve) => {
    timeoutId = setTimeout(() => resolve("timed_out"), ADMIN_EVENT_WRITE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([settled, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

function eventData(input: AdminEventInput, now: Date) {
  const definition = EVENT_DEFINITIONS[input.eventType];
  return {
    occurredAt: now,
    firstOccurredAt: now,
    severity: definition.severity,
    module: definition.module,
    eventType: input.eventType,
    searchText: [definition.searchText, input.reasonCode?.replaceAll("_", " ")].filter(Boolean).join(" "),
    userId: input.userId ?? null,
    essayId: input.essayId ?? null,
    accessCodeId: input.accessCodeId ?? null,
    provider: input.provider ?? null,
    reasonCode: input.reasonCode ?? null,
    httpStatus: input.httpStatus ?? null,
    quotaWindow: input.quotaWindow ?? null,
    usageValue: input.usageValue ?? null,
    quotaLimit: input.quotaLimit ?? null,
  };
}

/**
 * Best-effort, bounded-scope operational logging. An unavailable log table
 * must never alter a learner's access, quota, or provider response. The safe
 * event kind (not an error object/message) is retained in platform logs when
 * persistence itself fails.
 */
export async function recordAdminEvent(input: AdminEventInput, now = new Date()): Promise<void> {
  const safeInput = snapshotAdminEventInput(input);
  const safeNow = snapshotEventTime(now);
  if (!safeInput || !safeNow) {
    // Do not include input in this platform log: a bad future call may itself
    // contain exactly the sensitive value the ledger is designed to exclude.
    console.error("Admin event rejected by validation");
    return;
  }

  try {
    const definition = EVENT_DEFINITIONS[safeInput.eventType];
    const data = eventData(safeInput, safeNow);
    if (!definition.coalesceForMs) {
      const outcome = await awaitAdminEventWrite(prisma.adminEvent.create({ data }));
      if (outcome === "completed") return;
      console.error(
        outcome === "timed_out" ? "Admin event persistence timed out" : "Admin event persistence failed",
        safeInput.eventType,
      );
      return;
    }

    const dedupeKey = dedupeKeyFor(safeInput, safeNow, definition.coalesceForMs);
    const outcome = await awaitAdminEventWrite(prisma.adminEvent.upsert({
      where: { dedupeKey },
      create: { ...data, dedupeKey },
      update: {
        occurredAt: safeNow,
        occurrenceCount: { increment: 1 },
      },
    }));
    if (outcome === "completed") return;
    console.error(
      outcome === "timed_out" ? "Admin event persistence timed out" : "Admin event persistence failed",
      safeInput.eventType,
    );
  } catch {
    // Never serialize an upstream exception here: its message can include
    // user input, connection URLs, or credentials. The event kind is enough
    // to correlate this safe platform-level failure.
    console.error("Admin event persistence failed", safeInput.eventType);
  }
}

export function getAdminEventRetentionCutoff(now = new Date()) {
  return new Date(now.getTime() - ADMIN_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

export async function purgeExpiredAdminEvents(now = new Date()) {
  return prisma.adminEvent.deleteMany({ where: { occurredAt: { lt: getAdminEventRetentionCutoff(now) } } });
}

export type AdminEventMessageInput = {
  eventType: string;
  reasonCode: string | null;
  provider: string | null;
  quotaWindow: string | null;
  usageValue: number | null;
  quotaLimit: number | null;
  occurrenceCount: number;
};

/** Formats display copy only from fields that this module has whitelisted. */
export function formatAdminEventMessage(event: AdminEventMessageInput): string {
  const eventType = isMember(ADMIN_EVENT_TYPES, event.eventType) ? event.eventType : null;
  if (!eventType) return "Operational event recorded.";

  const provider = event.provider && isMember(ADMIN_EVENT_PROVIDERS, event.provider) ? event.provider : null;
  const reasonCode = event.reasonCode && isMember(ADMIN_EVENT_REASON_CODES, event.reasonCode) ? event.reasonCode : null;
  const quotaWindow =
    event.quotaWindow && isMember(ADMIN_EVENT_QUOTA_WINDOWS, event.quotaWindow) ? event.quotaWindow : null;
  const occurrenceCount =
    Number.isSafeInteger(event.occurrenceCount) && event.occurrenceCount >= 1 ? event.occurrenceCount : 1;
  const repeat = occurrenceCount > 1 ? ` (${occurrenceCount.toLocaleString("en-US")} occurrences)` : "";
  let quota = "";
  if (
    event.usageValue !== null &&
    event.quotaLimit !== null &&
    Number.isSafeInteger(event.usageValue) &&
    Number.isSafeInteger(event.quotaLimit) &&
    event.usageValue >= 0 &&
    event.quotaLimit >= 0
  ) {
    quota = ` (${event.usageValue.toLocaleString("en-US")}/${event.quotaLimit.toLocaleString("en-US")})`;
  }

  switch (eventType) {
    case "ACCESS_CODE_REDEEMED":
      return "Access code activated successfully.";
    case "ACCESS_CODE_REJECTED":
      return `Access-code activation was rejected (invalid or already spent).${repeat}`;
    case "TRANSLATION_QUOTA_DENIED":
      return `Translation ${quotaWindow ?? "quota"} limit reached${quota}.${repeat}`;
    case "EXAMPLE_QUOTA_DENIED":
      return `Example-generation ${reasonCode?.replaceAll("_", " ") ?? "quota"} limit reached${quota}.${repeat}`;
    case "CORRECTION_QUOTA_DENIED":
      return `Correction daily limit reached${quota}.${repeat}`;
    case "CORRECTION_PROVIDER_FAILED":
      return `Correction generation failed${provider ? ` (${provider})` : ""}: ${reasonCode?.replaceAll("_", " ") ?? "provider error"}.${repeat}`;
    case "EXAMPLE_PROVIDER_FAILED":
      return `Sample text generation failed${provider ? ` (${provider})` : ""}: ${reasonCode?.replaceAll("_", " ") ?? "provider error"}.${repeat}`;
    case "TRANSLATION_PROVIDER_FAILED":
      return `Translation generation failed${provider ? ` (${provider})` : ""}: ${reasonCode?.replaceAll("_", " ") ?? "provider error"}.${repeat}`;
    default:
      return "Operational event recorded.";
  }
}
