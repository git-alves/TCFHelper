/**
 * Production-only wrapper around syncSeedTopics, run from vercel-build.
 *
 * vercel.json's buildCommand runs `vercel-build` for every Vercel build --
 * preview deployments included, which intentionally have no production
 * DATABASE_URL (see deploy-additive-migrations.ts). Seeding unconditionally
 * from vercel-build would make every preview build fail while seeding, or
 * mutate whichever database happens to be attached. This uses the exact same
 * RUN_PRODUCTION_MIGRATIONS / VERCEL_ENV / DATABASE_URL gate as the
 * production migration script, so seeding only ever runs where migrations
 * do. `npm run db:seed` (scripts/seed-topics.ts) remains the unguarded
 * manual entrypoint for local/maintenance use.
 *
 * A production deploy can itself run concurrently with another (e.g. two
 * commits pushed in quick succession) -- syncSeedTopics's findFirst-then-
 * write per topic is only serially safe, so this also serializes the whole
 * sync behind a Postgres advisory lock (the same pattern used elsewhere in
 * this codebase, e.g. access-code.ts) rather than requiring every concurrent
 * build to coordinate through a new unique constraint and migration.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { syncSeedTopics } from "../src/lib/seed-topic-sync";
import { STARTER_TOPICS } from "../src/lib/starter-topics";

async function main() {
  if (process.env.RUN_PRODUCTION_MIGRATIONS !== "1") {
    console.log("Skipping starter-topic seeding: RUN_PRODUCTION_MIGRATIONS is not enabled.");
    return;
  }

  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    throw new Error("RUN_PRODUCTION_MIGRATIONS may only be enabled for a production Vercel deployment.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Starter-topic seeding requires DATABASE_URL in Vercel's build environment.");
  }

  const prisma = new PrismaClient();

  try {
    const { created, updated, unchanged } = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('deploy-seed-topics')::bigint)`;
        return syncSeedTopics(tx, STARTER_TOPICS);
      },
      { timeout: 30_000 },
    );

    console.log(`Starter-topic seed complete: ${created} created, ${updated} updated, ${unchanged} already current.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
