/**
 * Re-runnable import script: creates a Clerk user for every legacy local User
 * that doesn't have one yet (`clerkUserId IS NULL`), using the existing
 * User.id as Clerk's `externalId` and importing the existing bcrypt password
 * hash directly so learners keep signing in with their current password.
 *
 * It is a local eligibility dry run by default: it queries the database but
 * deliberately does not call Clerk, so it cannot discover remote collisions.
 * Clerk automatically verifies an email supplied to createUser(), while this
 * legacy app never verified signup emails. The mutating command therefore
 * requires both `--apply` and `--allow-auto-verified-email-import` after a
 * human has approved the account-linking cutover policy.
 *
 * Idempotent: before creating anything it looks up Clerk by externalId, so a
 * user already created by a prior partial run is only linked, not duplicated.
 * Keyset pagination advances past failures, so a permanently bad record
 * cannot make the script loop forever. Failures are logged per user (never
 * the password digest) and cause a non-zero exit after the full pass.
 *
 * Deliberately does not change existing essay/subscription/quota foreign
 * keys — those stay on User.id throughout the Clerk migration.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { createClerkClient } from "@clerk/backend";

const BATCH_SIZE = 50;
const MAX_RATE_LIMIT_RETRIES = 5;
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const allowAutoVerifiedEmailImport = args.has("--allow-auto-verified-email-import");

type LegacyUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
};

async function main() {
  if (!apply) {
    console.log(
      "Local eligibility dry run: no Clerk API calls or database rows will be changed. Clerk auto-verifies imported emails, so a mutating run requires both --apply and --allow-auto-verified-email-import.",
    );
  } else if (!allowAutoVerifiedEmailImport) {
    throw new Error(
      "Refusing to import: Clerk auto-verifies imported emails, but legacy signup emails were not verified. Re-run only after an approved account-linking cutover with --apply --allow-auto-verified-email-import.",
    );
  }

  const prisma = new PrismaClient();
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (apply && !secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set. Add it to .env before using --apply.");
  }
  const clerk = secretKey ? createClerkClient({ secretKey }) : null;

  let imported = 0;
  let linkedExisting = 0;
  let failed = 0;
  let skippedWithoutPassword = 0;
  let cursor: string | undefined;

  try {
    for (;;) {
      const users: LegacyUser[] = await prisma.user.findMany({
        where: {
          clerkUserId: null,
          ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        select: { id: true, email: true, name: true, passwordHash: true },
      });

      if (users.length === 0) break;
      cursor = users.at(-1)?.id;

      for (const user of users) {
        const passwordHash = user.passwordHash;
        if (!passwordHash) {
          skippedWithoutPassword += 1;
          console.error(`Skipping user ${user.id}: no legacy bcrypt password digest is available.`);
          continue;
        }

        if (!apply) {
          console.log(`Would import or link user ${user.id} through Clerk externalId.`);
          continue;
        }

        try {
          // `clerk` is only null in dry-run mode, which never reaches this
          // mutating branch.
          const existing = await withClerkRateLimitRetry(() =>
            clerk!.users.getUserList({ externalId: [user.id], limit: 1 }),
          );
          let clerkUserId = existing.data[0]?.id;

          if (clerkUserId) {
            linkedExisting += 1;
          } else {
            const created = await withClerkRateLimitRetry(() =>
              clerk!.users.createUser({
                externalId: user.id,
                emailAddress: [user.email],
                firstName: user.name ?? undefined,
                passwordDigest: passwordHash,
                passwordHasher: "bcrypt",
                skipPasswordChecks: true,
              }),
            );
            clerkUserId = created.id;
            imported += 1;
          }

          if (!clerkUserId) {
            throw new Error("Clerk returned no user ID for the imported account.");
          }

          const { count } = await prisma.user.updateMany({
            // A concurrent webhook/first-login mapping wins safely. On the
            // next run this record is skipped rather than overwritten.
            where: { id: user.id, clerkUserId: null },
            data: { clerkUserId },
          });
          if (count === 0) {
            const current = await prisma.user.findUnique({
              where: { id: user.id },
              select: { clerkUserId: true },
            });
            if (current?.clerkUserId !== clerkUserId) {
              throw new Error(
                `Local mapping changed concurrently (expected ${clerkUserId}, found ${current?.clerkUserId ?? "none"}). Resolve this account manually before cutover.`,
              );
            }
            console.log(`Local link for ${user.id} was completed concurrently.`);
          }
        } catch (error) {
          failed += 1;
          // Never log the request itself: it carries the bcrypt digest.
          console.error(`Failed to import user ${user.id}:`, error instanceof Error ? error.message : error);
        }
      }

      console.log(
        `Checkpoint: ${imported} created, ${linkedExisting} linked to an existing Clerk user, ${skippedWithoutPassword} skipped without a digest, ${failed} failed so far.`,
      );
    }

    const remainingUnmapped = await prisma.user.count({ where: { clerkUserId: null } });
    const mode = apply ? "Import complete" : "Local eligibility dry run complete";
    console.log(
      `${mode}: ${imported} created, ${linkedExisting} linked to an existing Clerk user, ${skippedWithoutPassword} skipped without a digest, ${failed} failed, ${remainingUnmapped} local users remain unmapped.`,
    );
    if (failed > 0 || skippedWithoutPassword > 0 || (apply && remainingUnmapped > 0)) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function withClerkRateLimitRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isClerkRateLimitError(error) || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw error;
      }

      const seconds = Math.min(Math.max(error.retryAfter ?? 1, 1), 10);
      console.warn(`Clerk rate limit reached; retrying in ${seconds}s (${attempt + 1}/${MAX_RATE_LIMIT_RETRIES}).`);
      await new Promise<void>((resolve) => setTimeout(resolve, seconds * 1000));
    }
  }
}

function isClerkRateLimitError(error: unknown): error is { status?: number; retryAfter?: number } {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; retryAfter?: unknown };
  return candidate.status === 429 &&
    (candidate.retryAfter === undefined || typeof candidate.retryAfter === "number");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
