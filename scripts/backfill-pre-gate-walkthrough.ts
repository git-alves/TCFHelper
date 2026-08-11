/**
 * Explicit, operator-run onboarding classification for accounts that existed
 * before the access-code gate went live. This must never run in a Vercel
 * build: a dry run exposes the exact candidate count/fingerprint, and --apply
 * requires those values to be explicitly echoed back by the operator.
 *
 * Usage:
 *   npm run onboarding:backfill-pre-gate -- --production
 *   npm run onboarding:backfill-pre-gate -- --production --apply --expected-count 12 --expected-fingerprint <sha256>
 */
import "dotenv/config";

import { Prisma, PrismaClient } from "@prisma/client";

import {
  ACCESS_CODE_GATE_LAUNCH_AT,
  PRE_GATE_WALKTHROUGH_BACKFILL_DATA,
  PRE_GATE_WALKTHROUGH_VERSION,
  isUtcTimeZone,
  preGateWalkthroughBackfillWhere,
  preGateWalkthroughCandidateFingerprint,
} from "../src/lib/pre-gate-walkthrough-backfill";
import { CURRENT_WALKTHROUGH_VERSION } from "../src/lib/walkthrough";

const BACKFILL_LOCK_KEY = "mytcflab-pre-gate-walkthrough-backfill-v1";

type Command =
  | { apply: false }
  | { apply: true; expectedCount: number; expectedFingerprint: string };

type CandidateSnapshot = {
  count: number;
  fingerprint: string;
};

type UserReader = Pick<Prisma.TransactionClient, "user">;
type DatabaseSession = Pick<Prisma.TransactionClient, "$queryRaw">;

function usage() {
  return [
    "Usage:",
    "  npm run onboarding:backfill-pre-gate -- --production",
    "  npm run onboarding:backfill-pre-gate -- --production --apply --expected-count <count> --expected-fingerprint <sha256>",
  ].join("\n");
}

function parseCommand(args: string[]): Command {
  let production = false;
  let apply = false;
  let expectedCountValue: string | undefined;
  let expectedFingerprintValue: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    switch (argument) {
      case "--production":
        if (production) throw new Error(`--production may be supplied only once.\n${usage()}`);
        production = true;
        break;
      case "--apply":
        if (apply) throw new Error(`--apply may be supplied only once.\n${usage()}`);
        apply = true;
        break;
      case "--expected-count":
      case "--expected-fingerprint": {
        const value = args[index + 1];
        if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.\n${usage()}`);
        index += 1;
        if (argument === "--expected-count") {
          if (expectedCountValue !== undefined) throw new Error(`--expected-count may be supplied only once.\n${usage()}`);
          expectedCountValue = value;
        } else {
          if (expectedFingerprintValue !== undefined) {
            throw new Error(`--expected-fingerprint may be supplied only once.\n${usage()}`);
          }
          expectedFingerprintValue = value.toLowerCase();
        }
        break;
      }
      default:
        throw new Error(`Unexpected argument: ${argument}.\n${usage()}`);
    }
  }

  if (!production) {
    throw new Error(`This maintenance command requires an explicit --production confirmation.\n${usage()}`);
  }
  if (!apply) {
    if (expectedCountValue !== undefined || expectedFingerprintValue !== undefined) {
      throw new Error(`--expected-count and --expected-fingerprint require --apply.\n${usage()}`);
    }
    return { apply: false };
  }

  if (!expectedCountValue || !expectedFingerprintValue) {
    throw new Error(`--apply requires both --expected-count and --expected-fingerprint.\n${usage()}`);
  }
  if (!/^\d+$/.test(expectedCountValue) || !Number.isSafeInteger(Number(expectedCountValue))) {
    throw new Error("--expected-count must be a non-negative safe integer.");
  }
  if (!/^[a-f0-9]{64}$/.test(expectedFingerprintValue)) {
    throw new Error("--expected-fingerprint must be a SHA-256 hexadecimal digest from the dry run.");
  }

  return {
    apply: true,
    expectedCount: Number(expectedCountValue),
    expectedFingerprint: expectedFingerprintValue,
  };
}

async function assertUtcTimeZone(db: DatabaseSession) {
  const rows = await db.$queryRaw<Array<{ timeZone: string }>>`
    SELECT current_setting('TimeZone') AS "timeZone"
  `;
  const timeZone = rows[0]?.timeZone;
  if (!isUtcTimeZone(timeZone)) {
    throw new Error(
      `Refusing to run because the database session time zone is ${timeZone ?? "unknown"}, not a UTC-compatible zero-offset zone. Verify production timestamp storage before this reviewed backfill.`,
    );
  }
}

async function candidateSnapshot(db: UserReader): Promise<CandidateSnapshot> {
  const users = await db.user.findMany({
    where: preGateWalkthroughBackfillWhere(),
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return {
    count: users.length,
    fingerprint: preGateWalkthroughCandidateFingerprint(users.map((user) => user.id)),
  };
}

function report(mode: "dry-run" | "applied", snapshot: CandidateSnapshot) {
  console.log(
    JSON.stringify(
      {
        operation: "pre-gate-walkthrough-backfill",
        mode,
        accessCodeGateLaunchAt: ACCESS_CODE_GATE_LAUNCH_AT,
        walkthroughVersion: PRE_GATE_WALKTHROUGH_VERSION,
        candidateCount: snapshot.count,
        candidateFingerprint: snapshot.fingerprint,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const command = parseCommand(process.argv.slice(2));
  if (process.env.VERCEL_ENV) {
    throw new Error("Run this reviewed maintenance command from a controlled production shell, never a Vercel build.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("This maintenance command requires a production DATABASE_URL.");
  }
  if (CURRENT_WALKTHROUGH_VERSION !== PRE_GATE_WALKTHROUGH_VERSION) {
    throw new Error(
      `Refusing to run: this approved backfill targets walkthrough version ${PRE_GATE_WALKTHROUGH_VERSION}, but the app now uses version ${CURRENT_WALKTHROUGH_VERSION}. Review the cohort policy before proceeding.`,
    );
  }

  const prisma = new PrismaClient();
  try {
    if (!command.apply) {
      const snapshot = await prisma.$transaction(async (tx) => {
        await assertUtcTimeZone(tx);
        return candidateSnapshot(tx);
      });
      report("dry-run", snapshot);
      console.log(
        `To apply the exact reviewed cohort, rerun with: npm run onboarding:backfill-pre-gate -- --production --apply --expected-count ${snapshot.count} --expected-fingerprint ${snapshot.fingerprint}`,
      );
      return;
    }

    const snapshot = await prisma.$transaction(
      async (tx) => {
        await assertUtcTimeZone(tx);
        await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${BACKFILL_LOCK_KEY})::bigint)`;

        const before = await candidateSnapshot(tx);
        if (before.count !== command.expectedCount || before.fingerprint !== command.expectedFingerprint) {
          throw new Error(
            "The candidate cohort changed since the dry run. Run the dry run again, review its count/fingerprint, and retry with those exact values.",
          );
        }

        const updated = await tx.user.updateMany({
          where: preGateWalkthroughBackfillWhere(),
          data: PRE_GATE_WALKTHROUGH_BACKFILL_DATA,
        });
        if (updated.count !== before.count) {
          throw new Error("The candidate cohort changed during the backfill transaction; no changes were committed.");
        }
        if (await tx.user.count({ where: preGateWalkthroughBackfillWhere() })) {
          throw new Error("The backfill postcondition failed; no changes were committed.");
        }

        return before;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    report("applied", snapshot);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
