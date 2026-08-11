import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { type User as ClerkBackendUser, type UserJSON } from "@clerk/backend";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_HEARTBEAT_THROTTLE_MS } from "@/lib/presence-limits";

const APP_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  locale: true,
  isAdmin: true,
  isBlocked: true,
  walkthroughCompletedVersion: true,
  lastActiveAt: true,
} satisfies Prisma.UserSelect;

// A slow or momentarily locked heartbeat write must never make an ordinary
// protected request wait for it -- this bounds how long touchLastActive
// delays the caller, not how long the write itself is allowed to keep
// running server-side.
const HEARTBEAT_WRITE_BOUND_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Records presence for the admin "online now" count. Never allowed to fail
 * the real request it was piggybacked on: this is a cosmetic side effect,
 * not something any authorization or business decision depends on.
 *
 * `lastActiveAt` is the value already fetched earlier in this same request
 * (a free read, not an extra query) and is used only as a fast skip: when it
 * is clearly fresh, no database round trip happens at all. That skip can
 * never cause an incorrect *write* to be missed under concurrency -- it only
 * ever avoids attempting one. Once a write is attempted, the conditional
 * updateMany's WHERE clause is what actually enforces correctness, re-
 * checking live database state under Postgres's own per-row update lock
 * rather than trusting this (possibly stale, possibly shared-with-another-
 * concurrent-request) snapshot. So a request that skipped because it saw a
 * fresh value never needed to write anyway, and a request that proceeds to
 * write is still safe against another request doing the same thing at the
 * same time.
 */
async function touchLastActive(userId: string, lastActiveAt: Date | null): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - ACTIVITY_HEARTBEAT_THROTTLE_MS);

  if (lastActiveAt && lastActiveAt >= cutoff) {
    return;
  }

  const write = prisma.user
    .updateMany({
      where: {
        id: userId,
        isBlocked: false,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: cutoff } }],
      },
      data: { lastActiveAt: now },
    })
    .catch((error) => {
      console.error("Presence heartbeat update failed", error);
    });

  await Promise.race([write, delay(HEARTBEAT_WRITE_BOUND_MS)]);
}

export type AppUser = Prisma.UserGetPayload<{ select: typeof APP_USER_SELECT }>;

export class AppUserProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppUserProvisioningError";
  }
}

type ClerkUserIdentity = {
  clerkUserId: string;
  externalId: string | null;
  email: string;
  name: string | null;
};

type UserStore = Pick<Prisma.TransactionClient, "user">;

/**
 * Reads the Clerk identity and session together so a caller that must act on
 * a specific session never couples one session's user ID to another session's
 * ID after a browser-side account switch.
 */
export async function getCurrentClerkRequestIdentity(): Promise<{
  userId: string | null;
  sessionId: string | null;
}> {
  const { userId, sessionId } = await auth();
  return { userId, sessionId };
}

/**
 * Returns the authenticated Clerk subject without creating or linking a
 * Prisma user. Read-only authenticated routes can use this when they do not
 * need the application's CUID.
 */
export async function getCurrentClerkUserId(): Promise<string | null> {
  return (await getCurrentClerkRequestIdentity()).userId;
}

/**
 * Resolves the current Clerk user to the app's stable CUID. Clerk's user ID
 * must never be written directly to Essay, Subscription, or TranslationQuota
 * foreign keys.
 *
 * Imported legacy users are linked only through Clerk's server-owned
 * externalId, which is the existing app CUID. A matching email alone is
 * deliberately never enough to attach an identity, because legacy emails
 * were not verified by this app.
 *
 * `skipPresenceTouch` exists for exactly one caller: the admin overview's
 * own client-side polling endpoint. Without it, refreshing that live tile
 * would keep resetting the owner's own presence indefinitely -- including
 * from a backgrounded tab -- making "online" self-sustaining rather than a
 * signal of real activity. Every other caller should omit it.
 */
export async function getCurrentAppUser(options?: { skipPresenceTouch?: boolean }): Promise<AppUser | null> {
  const clerkUserId = await getCurrentClerkUserId();
  if (!clerkUserId) {
    return null;
  }

  const mappedUser = await findAppUserByClerkId(clerkUserId);
  if (mappedUser) {
    if (mappedUser.isBlocked) return null;
    if (!options?.skipPresenceTouch) await touchLastActive(mappedUser.id, mappedUser.lastActiveAt);
    return mappedUser;
  }

  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) {
    throw new AppUserProvisioningError("The signed-in Clerk user could not be resolved.");
  }

  const syncedUser = await syncClerkUser(identityFromBackendUser(clerkUser));
  if (syncedUser.isBlocked) return null;
  if (!options?.skipPresenceTouch) await touchLastActive(syncedUser.id, syncedUser.lastActiveAt);
  return syncedUser;
}

/**
 * Resolves the owner account for an admin page or route. Callers deliberately
 * receive null for anonymous, blocked, and non-admin users so pages can
 * respond with notFound() and APIs with a non-disclosing 404.
 */
export async function getCurrentAdminUser(options?: { skipPresenceTouch?: boolean }): Promise<AppUser | null> {
  const user = await getCurrentAppUser(options);
  return user?.isAdmin ? user : null;
}

/**
 * Applies a Clerk `user.created` or `user.updated` payload once its primary
 * email is verified. It returns null for an unverified payload so the webhook
 * can acknowledge it; a later `user.updated` event or signed-in request will
 * perform the safe provisioning. The webhook route owns delivery idempotency;
 * this function owns identity resolution and is also reused by the
 * first-request fallback above.
 */
export async function syncClerkUserFromWebhook(
  user: UserJSON,
  db: UserStore = prisma,
): Promise<AppUser | null> {
  const identity = identityFromWebhookUser(user);
  // Clerk can emit `user.created` before the chosen email is verified. That
  // delivery must be acknowledged; a later verified `user.updated` event (or
  // the signed-in request resolver) will provision the account. Retrying the
  // same immutable unverified event forever cannot make it safe to link.
  if (!identity) {
    return null;
  }

  return syncClerkUser(identity, db);
}

async function syncClerkUser(identity: ClerkUserIdentity, db: UserStore = prisma): Promise<AppUser> {
  const existingClerkMapping = await findAppUserByClerkId(identity.clerkUserId, db);
  if (existingClerkMapping) {
    return updateClerkProfile(existingClerkMapping, identity, db);
  }

  if (identity.externalId) {
    const importedUser = await linkImportedClerkUser(identity.clerkUserId, identity.externalId, db);
    if (!importedUser) {
      throw new AppUserProvisioningError(
        "The imported Clerk user does not match an application user.",
      );
    }

    return updateClerkProfile(importedUser, identity, db);
  }

  // Do not turn an email collision into account linking. Existing users must
  // be imported to Clerk with externalId equal to their current app CUID.
  const emailCollision = await db.user.findFirst({
    where: { email: { equals: identity.email, mode: "insensitive" } },
    select: { id: true },
  });
  if (emailCollision) {
    throw new AppUserProvisioningError(
      "This email belongs to a legacy application account that has not been linked to Clerk yet.",
    );
  }

  try {
    return await db.user.create({
      data: {
        clerkUserId: identity.clerkUserId,
        email: identity.email,
        name: identity.name,
      },
      select: APP_USER_SELECT,
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      // Two first requests can race before the mapping exists. If the other
      // request created this Clerk mapping, use it; otherwise keep failing
      // closed instead of linking through email.
      const concurrentlyCreated = await findAppUserByClerkId(identity.clerkUserId, db);
      if (concurrentlyCreated) {
        return concurrentlyCreated;
      }

      // A different Clerk identity claimed this email while this request was
      // being provisioned. Never resolve that conflict by looking up the
      // email and linking to its owner.
      throw new AppUserProvisioningError(
        "This Clerk email conflicts with another application account.",
      );
    }

    throw error;
  }
}

function identityFromBackendUser(user: ClerkBackendUser): ClerkUserIdentity {
  const primaryEmail = user.primaryEmailAddress;
  return {
    clerkUserId: user.id,
    externalId: user.externalId,
    email: requireVerifiedEmail(primaryEmail?.emailAddress, primaryEmail?.verification?.status),
    name: normalizedName(user.firstName, user.lastName, user.fullName),
  };
}

function identityFromWebhookUser(user: UserJSON): ClerkUserIdentity | null {
  const primaryEmail = user.email_addresses.find(
    (email) => email.id === user.primary_email_address_id,
  );

  const email = verifiedEmailOrNull(
    primaryEmail?.email_address,
    primaryEmail?.verification?.status,
  );
  if (!email) {
    return null;
  }

  return {
    clerkUserId: user.id,
    externalId: user.external_id,
    email,
    name: normalizedName(user.first_name, user.last_name),
  };
}

function requireVerifiedEmail(email: string | undefined, verificationStatus: string | undefined): string {
  const verifiedEmail = verifiedEmailOrNull(email, verificationStatus);
  if (!verifiedEmail) {
    throw new AppUserProvisioningError(
      "A verified primary email address is required before an application account can be created.",
    );
  }

  return verifiedEmail;
}

function verifiedEmailOrNull(
  email: string | undefined,
  verificationStatus: string | undefined,
): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized && verificationStatus === "verified" ? normalized : null;
}

function normalizedName(
  firstName: string | null,
  lastName: string | null,
  fullName?: string | null,
): string | null {
  const fromFullName = fullName?.trim();
  if (fromFullName) return fromFullName;

  const fromParts = [firstName, lastName].filter((part): part is string => Boolean(part?.trim())).join(" ");
  return fromParts || null;
}

async function updateClerkProfile(
  appUser: AppUser,
  identity: ClerkUserIdentity,
  db: UserStore = prisma,
): Promise<AppUser> {
  const emailCollision = await db.user.findFirst({
    where: { email: { equals: identity.email, mode: "insensitive" } },
    select: { id: true },
  });
  if (emailCollision && emailCollision.id !== appUser.id) {
    throw new AppUserProvisioningError(
      "The Clerk email conflicts with another application account.",
    );
  }

  try {
    return await db.user.update({
      where: { id: appUser.id },
      data: {
        email: identity.email,
        // A social provider does not always provide a name. Retain a
        // learner's existing display name rather than replacing it with null.
        name: identity.name ?? appUser.name,
      },
      select: APP_USER_SELECT,
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      throw new AppUserProvisioningError(
        "The Clerk email conflicts with another application account.",
      );
    }
    throw error;
  }
}

/**
 * Links an imported Clerk identity through a Clerk-controlled externalId.
 * This can safely be called from a verified webhook as well as the
 * first-request fallback; it never links records by email.
 */
export async function linkImportedClerkUser(
  clerkUserId: string,
  appUserId: string,
  db: UserStore = prisma,
): Promise<AppUser | null> {
  const existingClerkMapping = await findAppUserByClerkId(clerkUserId, db);
  if (existingClerkMapping) {
    if (existingClerkMapping.id !== appUserId) {
      throw new AppUserProvisioningError(
        "This Clerk user is already linked to a different application account.",
      );
    }
    return existingClerkMapping;
  }

  const appUser = await db.user.findUnique({
    where: { id: appUserId },
    select: { id: true, clerkUserId: true },
  });
  if (!appUser) {
    return null;
  }

  if (appUser.clerkUserId && appUser.clerkUserId !== clerkUserId) {
    throw new AppUserProvisioningError(
      "This application account is already linked to a different Clerk user.",
    );
  }

  try {
    return await db.user.update({
      where: { id: appUser.id },
      data: { clerkUserId },
      select: APP_USER_SELECT,
    });
  } catch (error) {
    if (isUniqueConstraint(error)) {
      const concurrentlyLinked = await findAppUserByClerkId(clerkUserId, db);
      if (concurrentlyLinked?.id === appUserId) {
        return concurrentlyLinked;
      }
    }

    throw error;
  }
}

async function findAppUserByClerkId(
  clerkUserId: string,
  db: UserStore = prisma,
): Promise<AppUser | null> {
  return db.user.findUnique({
    where: { clerkUserId },
    select: APP_USER_SELECT,
  });
}

function isUniqueConstraint(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
