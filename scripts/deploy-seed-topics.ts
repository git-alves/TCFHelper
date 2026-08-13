/**
 * Production wrapper around syncSeedTopics, run by a human operator once a
 * deploy carrying a corrected starter-topic prompt is confirmed live. Exact
 * invocation (see README's "Starter-topic bank rollout"):
 *
 *   RUN_PRODUCTION_MIGRATIONS=1 VERCEL_ENV=production \
 *     vercel env run -e production -- npm run db:seed:deploy
 *
 * `vercel env run -e production` injects production environment variables
 * (including DATABASE_URL) directly into this process without ever writing
 * them to disk -- unlike `vercel env pull`, which would require this
 * script's `dotenv/config` import to load whatever file they were pulled
 * into. `-e production` matters: a bare pull/run without it targets
 * Development.
 *
 * Deliberately not part of the automated deploy path (README's "Starter-topic
 * bank rollout"): vercel-build runs entirely *before* Vercel promotes the new
 * build to production traffic, so retiring a row from inside it would be
 * invisible to the new deployment's retiredAt-aware picker while the
 * previous deployment -- still live and serving requests until cutover
 * completes -- has no such filter and would list both the retired and
 * replacement topic as duplicates. Running this only after the operator has
 * confirmed the new code is actually live avoids that window entirely, and
 * needs no scheduler, works identically for either documented Vercel deploy
 * path, and has no dependency on GitHub Actions build ordering.
 *
 * `VERCEL_ENV=production` is required explicitly, not merely allowed, unlike
 * the production migration script's own gate: that script runs *inside*
 * Vercel's own build, where Vercel sets `VERCEL_ENV` for it automatically.
 * This one only ever runs on an operator's own machine, where nothing sets
 * `VERCEL_ENV` unless the operator does -- so it doubles as the operator's
 * explicit confirmation that `DATABASE_URL` was actually pulled from
 * production, not silently accepted because it happened to be unset.
 * `npm run db:seed` (scripts/seed-topics.ts) remains the fully unguarded
 * manual entrypoint for local/maintenance use against any database.
 *
 * Run this from a fresh checkout of the exact commit that is live in
 * production (check the Vercel dashboard's deployment commit SHA). Running
 * it from a stale local checkout would retire the current, corrected
 * starter-topic bank back to whatever `STARTER_TOPICS` looked like at that
 * older commit.
 *
 * Run this once per prompt correction, not repeatedly: two operators running
 * it back to back, or one running it twice, is still safe (runLockedSeedTopicSync
 * serializes via the same advisory lock `npm run db:seed` uses), but each run
 * after the first is a no-op against unchanged prompts.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { runLockedSeedTopicSync } from "../src/lib/seed-topic-sync";
import { STARTER_TOPICS } from "../src/lib/starter-topics";

async function main() {
  if (process.env.RUN_PRODUCTION_MIGRATIONS !== "1") {
    console.log("Skipping starter-topic seeding: RUN_PRODUCTION_MIGRATIONS is not enabled.");
    return;
  }

  if (process.env.VERCEL_ENV !== "production") {
    throw new Error(
      "Starter-topic seeding requires VERCEL_ENV=production, set explicitly to confirm this run is intentionally targeting production.",
    );
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Starter-topic seeding requires DATABASE_URL pulled from the production environment.");
  }

  const prisma = new PrismaClient();

  try {
    const { created, retired, unchanged } = await runLockedSeedTopicSync(prisma, STARTER_TOPICS);

    console.log(
      `Starter-topic seed complete: ${created} created, ${retired} retired & replaced, ${unchanged} already current.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
