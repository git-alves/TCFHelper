import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";

type MigrationHistoryRow = {
  exists: boolean;
};

type AppliedMigrationRow = {
  migrationName: string;
};

// `prisma migrate deploy` always applies every pending migration. Keep this
// allowlist deliberately explicit so a future contract/destructive migration
// fails the remote build until it has an approved maintenance runbook.
//
// A newly-created database has no migration history, so applying the complete
// history is safe: there is no previous application version or data to keep
// compatible. Existing databases may only receive migrations named here.
const AUTOMATIC_ADDITIVE_MIGRATIONS = new Set([
  "20260729130000_subscription_status_and_event_ordering",
  "20260729140000_add_stripe_event_and_customer_index",
  "20260731170000_add_recent_exam_topic_provenance",
  "20260731200000_add_translation_quota",
]);

const migrationsDirectory = join(process.cwd(), "prisma", "migrations");

function listCommittedMigrations() {
  return readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((migrationName) => existsSync(join(migrationsDirectory, migrationName, "migration.sql")))
    .sort();
}

function runMigrations() {
  execFileSync("npm", ["run", "db:deploy"], {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

async function migrationHistoryExists(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<MigrationHistoryRow[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = current_schema() AND tablename = '_prisma_migrations'
    ) AS "exists"
  `;

  return rows[0]?.exists ?? false;
}

async function applicationTablesExist(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<MigrationHistoryRow[]>`
    SELECT EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = current_schema()
        AND tablename IN (
          'User',
          'Subscription',
          'Topic',
          'Essay',
          'Feedback',
          'StripeEvent',
          'TranslationQuota'
        )
    ) AS "exists"
  `;

  return rows[0]?.exists ?? false;
}

async function appliedMigrationNames(prisma: PrismaClient) {
  const rows = await prisma.$queryRaw<AppliedMigrationRow[]>`
    SELECT migration_name AS "migrationName"
    FROM "_prisma_migrations"
    WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
  `;

  return new Set(rows.map((row) => row.migrationName));
}

async function main() {
  // The GitHub production deploy passes this as a build-only value. Preview
  // deployments and ordinary local builds intentionally do not touch a DB.
  if (process.env.RUN_PRODUCTION_MIGRATIONS !== "1") {
    console.log("Skipping production migrations: RUN_PRODUCTION_MIGRATIONS is not enabled.");
    return;
  }

  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    throw new Error("RUN_PRODUCTION_MIGRATIONS may only be enabled for a production Vercel deployment.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Production migrations require DATABASE_URL in Vercel's build environment.");
  }

  const prisma = new PrismaClient();

  try {
    if (!(await migrationHistoryExists(prisma))) {
      if (await applicationTablesExist(prisma)) {
        throw new Error(
          "Production migration policy found application tables without Prisma migration history. Refusing to bootstrap an existing database; establish the migration state through the maintenance runbook."
        );
      }

      console.log("No Prisma migration history found; bootstrapping the new production database.");
      runMigrations();
      return;
    }

    const applied = await appliedMigrationNames(prisma);
    const pending = listCommittedMigrations().filter((migrationName) => !applied.has(migrationName));
    const blocked = pending.filter((migrationName) => !AUTOMATIC_ADDITIVE_MIGRATIONS.has(migrationName));

    if (blocked.length > 0) {
      throw new Error(
        `Production migration policy blocked pending migration(s): ${blocked.join(
          ", "
        )}. Apply contract/destructive migrations through the explicit maintenance runbook, or add a reviewed additive migration to AUTOMATIC_ADDITIVE_MIGRATIONS.`
      );
    }

    if (pending.length === 0) {
      console.log("No pending additive production migrations.");
      return;
    }

    console.log(`Applying reviewed additive production migration(s): ${pending.join(", ")}`);
    runMigrations();
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
