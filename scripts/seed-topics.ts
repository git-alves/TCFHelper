/**
 * Manual seed script: populates the Topic table with the starter bank of
 * writing prompts for each TCF task type. Run with `npm run db:seed`.
 *
 * Safe to re-run: it preserves learner/recent/AI topics and keeps the
 * managed OFFICIAL_EXAM starter prompts aligned with this bank.
 *
 * This always runs against whatever DATABASE_URL is configured, with no
 * production/environment guard -- for the guarded wrapper Vercel's build
 * actually invokes, see deploy-seed-topics.ts. It still goes through the
 * same advisory-lock helper that wrapper uses, so a manual run can't race a
 * concurrent deploy (or another manual run).
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runLockedStarterTopicBankSync } from "../src/lib/seed-topic-sync";
import { STARTER_TOPICS, STARTER_TOPIC_BANK_VERSION } from "../src/lib/starter-topics";

const prisma = new PrismaClient();

async function main() {
  const { created, retired, unchanged, status } = await runLockedStarterTopicBankSync(prisma, {
    version: STARTER_TOPIC_BANK_VERSION,
    topics: STARTER_TOPICS,
  });

  console.log(`Seed ${status}: ${created} created, ${retired} retired & replaced, ${unchanged} already current.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
