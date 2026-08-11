/**
 * Production release guard for the Clerk cutover.
 *
 * The schema migration alone is not enough to release Clerk-backed code to a
 * database that still has legacy users. Those users would authenticate but
 * fail closed because their local CUID has no Clerk mapping. Run this after
 * the additive migration and before the production build so a release cannot
 * make that state live.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

async function main() {
  // A Vercel production build must opt into the guarded migration/cutover
  // path. Silently skipping it because an environment setting was omitted
  // would release Clerk code before legacy users are imported.
  if (process.env.VERCEL_ENV === "production" && process.env.RUN_PRODUCTION_MIGRATIONS !== "1") {
    throw new Error(
      "Production Vercel builds require RUN_PRODUCTION_MIGRATIONS=1 so Clerk migrations and the cutover check cannot be skipped.",
    );
  }

  // Ordinary local and preview builds must stay database-free. The Vercel
  // production build sets this explicit flag immediately before its guarded
  // additive migration step.
  if (process.env.RUN_PRODUCTION_MIGRATIONS !== "1") {
    console.log("Skipping Clerk cutover check: RUN_PRODUCTION_MIGRATIONS is not enabled.");
    return;
  }

  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    throw new Error("The Clerk cutover check may only run for a production Vercel deployment.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("The Clerk cutover check requires DATABASE_URL in Vercel's build environment.");
  }

  // Clerk documents sk_live_/pk_live_ for production instances. Requiring
  // both here catches an otherwise easy-to-miss deployment that points the
  // live database at a development Clerk instance before users are imported.
  if (!process.env.CLERK_SECRET_KEY?.startsWith("sk_live_")) {
    throw new Error("A production Clerk cutover requires CLERK_SECRET_KEY from a production instance (sk_live_*).");
  }
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_live_")) {
    throw new Error(
      "A production Clerk cutover requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY from a production instance (pk_live_*).",
    );
  }
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET?.startsWith("whsec_")) {
    throw new Error("A production Clerk cutover requires CLERK_WEBHOOK_SIGNING_SECRET for the verified user-sync webhook.");
  }
  if (
    !process.env.SECURITY_TELEMETRY_HMAC_SECRET ||
    Buffer.byteLength(process.env.SECURITY_TELEMETRY_HMAC_SECRET, "utf8") < 32
  ) {
    throw new Error(
      "Production session telemetry requires SECURITY_TELEMETRY_HMAC_SECRET with at least 32 random bytes.",
    );
  }

  const prisma = new PrismaClient();
  try {
    const unmappedUsers = await prisma.user.count({ where: { clerkUserId: null } });
    if (unmappedUsers > 0) {
      throw new Error(
        `Clerk cutover blocked: ${unmappedUsers} local user record(s) have no clerkUserId. Import every legacy user before releasing Clerk-backed code.`,
      );
    }

    console.log("Clerk cutover check passed: every local user has a Clerk mapping.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
