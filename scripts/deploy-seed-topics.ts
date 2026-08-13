/**
 * Production wrapper around syncSeedTopics, run by a human operator once a
 * deploy carrying a corrected starter-topic prompt is confirmed live. Exact
 * invocation (see README's "Starter-topic bank rollout"):
 *
 *   env -i PATH="$PATH" HOME="$HOME" \
 *     RUN_PRODUCTION_MIGRATIONS=1 VERCEL_ENV=production \
 *     vercel env run -e production -- npm run db:seed:deploy
 *
 * `vercel env run -e production` injects production environment variables
 * (including DATABASE_URL) directly into this process without ever writing
 * them to disk, unlike `vercel env pull`. `-e production` matters: a bare
 * pull/run without it targets Development.
 *
 * `env -i` (start the child with an empty environment, plus only the
 * explicitly listed names) matters too, and replaces selectively unsetting
 * individual variables: `vercel env run` resolves its child process's
 * environment as fetched-production values, overridden by any local `.env*`
 * file's, overridden in turn by whatever the invoking shell already has
 * exported -- so a `DATABASE_URL` left over in the operator's shell session
 * would silently win over the freshly fetched production value. Worse,
 * `NODE_OPTIONS=--require dotenv/config` (optionally with
 * `DOTENV_CONFIG_PATH` pointed anywhere, e.g. the committed `.env.example`)
 * or `npm_config_node_options` doing the same for npm's own child process
 * injects DATABASE_URL before this script's code -- including
 * `assertNoLocalEnvFiles` below -- ever runs at all, since a `--require`
 * preload executes before the entry file loads. No script-side check can
 * close that: it runs too late by construction. `env -i` closes it at the
 * source by never letting the shell's `NODE_OPTIONS`/`npm_config_node_options`
 * (or any other variable capable of influencing Node/npm/Vercel CLI behavior
 * in ways not yet identified) reach the child process in the first place,
 * rather than unsetting only the specific names already known to matter.
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
 *
 * No `dotenv/config` here, deliberately: this script's own env loading would
 * be redundant at best (`vercel env run` already injects DATABASE_URL
 * directly) and at worst another way to load a stray local file. Local
 * env-file presence is instead actively rejected by `assertNoLocalEnvFiles`
 * below (defense in depth against a normal execution path missing `env -i`;
 * see local-env-guard.ts for exactly which files it checks and why it's
 * deliberately broader than the installed CLI's own documented behavior).
 * This check runs too late to catch a preload-based injection -- `env -i` in
 * the documented command is the actual defense against that, not this.
 */
import { PrismaClient } from "@prisma/client";
import { assertNoLocalEnvFiles } from "../src/lib/local-env-guard";
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

  assertNoLocalEnvFiles();

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
