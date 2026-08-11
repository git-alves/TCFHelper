import "server-only";

import { createHash, createHmac } from "node:crypto";
import type { UserJSON } from "@clerk/backend";
import { Prisma } from "@prisma/client";
import ipaddr from "ipaddr.js";
import {
  ADMIN_EVENT_NETWORK_UNAVAILABLE,
  ADMIN_EVENT_RETENTION_DAYS,
  recordAdminEventInTransaction,
  type AdminEventBrowserFamily,
  type AdminEventDeviceClass,
} from "@/lib/admin-events";
import { AppUserProvisioningError, syncClerkUserFromWebhook } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

export const AUTH_SECURITY_REVIEW_WINDOW_MINUTES = 10;
export const AUTH_SECURITY_REVIEW_WINDOW_MS = AUTH_SECURITY_REVIEW_WINDOW_MINUTES * 60 * 1_000;
export const AUTH_SECURITY_HMAC_SECRET_ENV = "SECURITY_TELEMETRY_HMAC_SECRET";

const AUTH_SECURITY_TRANSACTION_TIMEOUT_MS = 5_000;
const MINIMUM_HMAC_SECRET_BYTES = 32;
const FINGERPRINT_VERSION = "v1";
const MAX_SOURCE_CLOCK_SKEW_MS = 5 * 60_000;
const MAX_CLERK_IDENTIFIER_LENGTH = 255;

type AuthSecurityTransaction = Pick<
  Prisma.TransactionClient,
  "user" | "authSecuritySession" | "adminEvent" | "$executeRaw"
>;

export type VerifiedSessionSecurityInput = {
  clerkUserId: unknown;
  clerkSessionId: unknown;
  occurredAt: unknown;
  clientIp: unknown;
  browserName: unknown;
  deviceType: unknown;
  isMobile: unknown;
  actor: unknown;
  embeddedUser: UserJSON | null;
};

export type AuthSecuritySessionOutcome =
  | { kind: "recorded"; alerted: boolean }
  | { kind: "duplicate" }
  | { kind: "unlinked" }
  | { kind: "ignored" };

type DerivedNetwork = {
  maskedIp: string;
  ipFingerprint: string | null;
};

type SessionForReview = {
  id: string;
  occurredAt: Date;
  sessionFingerprint: string;
  ipFingerprint: string | null;
};

type ReviewWindow = {
  startedAt: Date;
  distinctIpCount: number;
};

export class AuthSecurityConfigurationError extends Error {
  constructor() {
    super("Security telemetry is not configured.");
    this.name = "AuthSecurityConfigurationError";
  }
}

function hasSafeClerkIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= MAX_CLERK_IDENTIFIER_LENGTH &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function configuredHmacSecret() {
  const secret = process.env[AUTH_SECURITY_HMAC_SECRET_ENV];
  if (!secret || Buffer.byteLength(secret, "utf8") < MINIMUM_HMAC_SECRET_BYTES) {
    throw new AuthSecurityConfigurationError();
  }
  return secret;
}

function fingerprint(secret: string, domain: "ip" | "session", value: string) {
  return `${FINGERPRINT_VERSION}:${createHmac("sha256", secret)
    .update(`${domain}:${FINGERPRINT_VERSION}\u0000${value}`, "utf8")
    .digest("hex")}`;
}

function isSafeRawIp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 64 &&
    value.trim() === value &&
    !/[\s,\[\]%]/.test(value)
  );
}

/**
 * Uses the signed Clerk request metadata only. The raw value is normalized,
 * HMACed, and discarded within this function; callers receive no full IP.
 */
export function deriveMaskedNetwork(clientIp: unknown, secret = configuredHmacSecret()): DerivedNetwork {
  if (!isSafeRawIp(clientIp)) {
    return { maskedIp: ADMIN_EVENT_NETWORK_UNAVAILABLE, ipFingerprint: null };
  }

  try {
    let address = ipaddr.parse(clientIp);
    if (address.kind() === "ipv6") {
      const ipv6 = address as ipaddr.IPv6;
      if (ipv6.isIPv4MappedAddress()) {
        address = ipv6.toIPv4Address();
      }
    }

    const canonical = address.toNormalizedString();
    if (address.kind() === "ipv4") {
      const octets = canonical.split(".");
      if (octets.length !== 4) throw new Error("Invalid canonical IPv4 address");
      return {
        maskedIp: `${octets.slice(0, 3).join(".")}.*`,
        ipFingerprint: fingerprint(secret, "ip", canonical),
      };
    }

    const groups = canonical.split(":");
    if (groups.length !== 8) throw new Error("Invalid canonical IPv6 address");
    return {
      maskedIp: `${groups.slice(0, 3).join(":")}::/48`,
      ipFingerprint: fingerprint(secret, "ip", canonical),
    };
  } catch {
    return { maskedIp: ADMIN_EVENT_NETWORK_UNAVAILABLE, ipFingerprint: null };
  }
}

export function deriveBrowserFamily(browserName: unknown): AdminEventBrowserFamily {
  const normalized = typeof browserName === "string" ? browserName.trim().toLowerCase() : "";
  if (normalized.includes("samsung")) return "Samsung Internet";
  if (normalized.includes("edge") || normalized === "edg") return "Edge";
  if (normalized.includes("chrome") || normalized.includes("chromium")) return "Chrome";
  if (normalized.includes("firefox")) return "Firefox";
  if (normalized.includes("opera") || normalized === "opr") return "Opera";
  if (normalized.includes("safari")) return "Safari";
  return "Other browser";
}

export function deriveDeviceClass(deviceType: unknown, isMobile: unknown): AdminEventDeviceClass {
  if (isMobile === true) return "Mobile";
  const normalized = typeof deviceType === "string" ? deviceType.trim().toLowerCase() : "";
  if (normalized.includes("tablet")) return "Tablet";
  if (normalized.includes("mobile")) return "Mobile";
  if (normalized.includes("desktop") || normalized.includes("computer")) return "Desktop";
  return "Other device";
}

/** Returns a valid, in-retention Clerk source timestamp or null to acknowledge a stale/malformed replay. */
export function parseSessionOccurredAt(value: unknown, receivedAt = new Date()): Date | null {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) return null;
  const occurredAt = new Date(value);
  const timestamp = occurredAt.getTime();
  const receivedTimestamp = receivedAt.getTime();
  if (
    !Number.isFinite(timestamp) ||
    !Number.isFinite(receivedTimestamp) ||
    timestamp > receivedTimestamp + MAX_SOURCE_CLOCK_SKEW_MS ||
    timestamp < receivedTimestamp - ADMIN_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1_000
  ) {
    return null;
  }
  return occurredAt;
}

function alertDedupeKey(userId: string, startedAt: Date) {
  return createHash("sha256")
    .update(`auth-security-review\u0000${userId}\u0000${startedAt.toISOString()}`, "utf8")
    .digest("hex");
}

/**
 * Finds an actual rolling window that includes the newly stored session. This
 * works when Clerk deliveries arrive out of order because it uses the source
 * session timestamp rather than webhook receipt time.
 */
export function findReviewWindow(
  sessions: readonly SessionForReview[],
  currentSessionFingerprint: string,
): ReviewWindow | null {
  const sorted = [...sessions].sort(
    (left, right) =>
      left.occurredAt.getTime() - right.occurredAt.getTime() || left.id.localeCompare(right.id),
  );

  for (let startIndex = 0; startIndex < sorted.length; startIndex += 1) {
    const startedAt = sorted[startIndex]?.occurredAt;
    if (!startedAt) continue;
    const fingerprints = new Set<string>();
    let containsCurrentSession = false;

    for (let endIndex = startIndex; endIndex < sorted.length; endIndex += 1) {
      const session = sorted[endIndex];
      if (!session || session.occurredAt.getTime() - startedAt.getTime() > AUTH_SECURITY_REVIEW_WINDOW_MS) {
        break;
      }
      if (session.ipFingerprint) fingerprints.add(session.ipFingerprint);
      if (session.sessionFingerprint === currentSessionFingerprint) containsCurrentSession = true;
      if (containsCurrentSession && fingerprints.size >= 3) {
        return { startedAt, distinctIpCount: fingerprints.size };
      }
    }
  }

  return null;
}

async function resolveLocalUserId(tx: AuthSecurityTransaction, input: VerifiedSessionSecurityInput) {
  const clerkUserId = input.clerkUserId;
  if (!hasSafeClerkIdentifier(clerkUserId)) return null;

  const existing = await tx.user.findUnique({ where: { clerkUserId }, select: { id: true } });
  if (existing) return existing.id;

  // The signed embedded user is the only safe fallback for user/session
  // ordering races. A verified email and existing app-user safeguards remain
  // enforced by the shared synchronization helper.
  if (!input.embeddedUser || input.embeddedUser.id !== clerkUserId) return null;
  try {
    return (await syncClerkUserFromWebhook(input.embeddedUser, tx))?.id ?? null;
  } catch (error) {
    // A known unsafe identity link is not made safe by retrying an immutable
    // session delivery. Acknowledge without creating an owner-visible record.
    if (error instanceof AppUserProvisioningError) return null;
    throw error;
  }
}

/**
 * Stores one verified Clerk session event and, only when warranted, a
 * review-only concurrent-access warning. It never affects Clerk sign-in;
 * failures return to the webhook for Clerk retry after the session is already
 * established on Clerk's side.
 */
export async function recordAuthSecuritySession(
  input: VerifiedSessionSecurityInput,
  receivedAt = new Date(),
): Promise<AuthSecuritySessionOutcome> {
  if ((input.actor !== null && input.actor !== undefined) || !hasSafeClerkIdentifier(input.clerkSessionId)) {
    return { kind: "ignored" };
  }
  const occurredAt = parseSessionOccurredAt(input.occurredAt, receivedAt);
  if (!occurredAt) return { kind: "ignored" };

  const secret = configuredHmacSecret();
  const sessionFingerprint = fingerprint(secret, "session", input.clerkSessionId);
  const network = deriveMaskedNetwork(input.clientIp, secret);
  const browserFamily = deriveBrowserFamily(input.browserName);
  const deviceClass = deriveDeviceClass(input.deviceType, input.isMobile);

  return prisma.$transaction(
      async (tx) => {
        const userId = await resolveLocalUserId(tx, input);
        if (!userId) return { kind: "unlinked" };

        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`auth-security:${userId}`})::bigint)`;

        const existing = await tx.authSecuritySession.findUnique({
          where: { sessionFingerprint },
          select: { id: true },
        });
        if (existing) return { kind: "duplicate" };

        const session = await tx.authSecuritySession.create({
          data: {
            userId,
            occurredAt,
            sessionFingerprint,
            ipFingerprint: network.ipFingerprint,
          },
          select: { id: true },
        });

        await recordAdminEventInTransaction(
          tx,
          {
            eventType: "AUTH_SESSION_CREATED",
            userId,
            maskedIp: network.maskedIp,
            browserFamily,
            deviceClass,
          },
          occurredAt,
        );

        if (!network.ipFingerprint) return { kind: "recorded", alerted: false };

        const rangeStart = new Date(occurredAt.getTime() - AUTH_SECURITY_REVIEW_WINDOW_MS);
        const rangeEnd = new Date(occurredAt.getTime() + AUTH_SECURITY_REVIEW_WINDOW_MS);
        const sessions = await tx.authSecuritySession.findMany({
          where: {
            userId,
            occurredAt: { gte: rangeStart, lte: rangeEnd },
            ipFingerprint: { not: null },
          },
          select: { id: true, occurredAt: true, sessionFingerprint: true, ipFingerprint: true },
        });
        const reviewWindow = findReviewWindow(sessions, sessionFingerprint);
        if (!reviewWindow) return { kind: "recorded", alerted: false };

        // An alert covers a rolling ten-minute span. Overlapping spans are one
        // review incident, so a fourth session cannot turn into a second
        // warning merely because deliveries arrived later or out of order.
        const overlappingAlert = await tx.authSecuritySession.findFirst({
          where: {
            userId,
            alertBucketStartedAt: {
              not: null,
              gte: new Date(reviewWindow.startedAt.getTime() - AUTH_SECURITY_REVIEW_WINDOW_MS),
              lte: new Date(reviewWindow.startedAt.getTime() + AUTH_SECURITY_REVIEW_WINDOW_MS),
            },
          },
          select: { id: true },
        });
        if (overlappingAlert) return { kind: "recorded", alerted: false };

        await tx.authSecuritySession.update({
          where: { id: session.id },
          data: { alertBucketStartedAt: reviewWindow.startedAt },
        });

        await recordAdminEventInTransaction(
          tx,
          {
            eventType: "AUTH_NETWORK_REVIEW_REQUIRED",
            userId,
            distinctIpCount: reviewWindow.distinctIpCount,
            securityWindowMinutes: AUTH_SECURITY_REVIEW_WINDOW_MINUTES,
          },
          occurredAt,
          { dedupeKey: alertDedupeKey(userId, reviewWindow.startedAt) },
        );

        return { kind: "recorded", alerted: true };
      },
      { timeout: AUTH_SECURITY_TRANSACTION_TIMEOUT_MS },
    );
}
