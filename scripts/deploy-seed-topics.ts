/**
 * Production wrapper around syncSeedTopics, run by a human operator once a
 * deploy carrying a corrected starter-topic prompt is confirmed live. Exact
 * invocation (see README's "Starter-topic bank rollout"), from a fresh
 * checkout at the exact commit shown as live in the Vercel dashboard:
 *
 *   npm ci
 *   vercel link --yes --project <production-project-id> --team <production-team>
 *   ./scripts/assert-no-local-env-files.sh && \
 *     env -i PATH="$PATH" HOME="$HOME" \
 *       RUN_PRODUCTION_MIGRATIONS=1 VERCEL_ENV=production \
 *       vercel env run -e production -- ./node_modules/.bin/tsx scripts/deploy-seed-topics.ts
 *
 * `npm ci` matters: `node_modules` (including `./node_modules/.bin/tsx` and
 * the generated Prisma client, rebuilt by its own `postinstall`) is
 * gitignored, so a genuinely fresh checkout starts without either.
 *
 * `vercel link --yes` alone is not enough to target the right project: run
 * non-interactively without `--project` (sourced from the production
 * project's own Vercel dashboard URL/settings, not guessed), it can
 * default to, or silently create, the wrong project -- and `vercel env run`
 * would then fetch *that* project's "production" database, not this one's.
 * `--team` matters the same way whenever the project lives under a team,
 * not the operator's personal account. `vercel link` runs in the operator's
 * normal environment (not the stripped-down one below), since it needs
 * their stored Vercel credentials.
 *
 * `./scripts/assert-no-local-env-files.sh` matters, and runs *before*
 * `vercel env run` rather than as another check inside this script, for a
 * structural reason: `vercel env run` reads local `.env*` files itself and
 * merges their content into the child process's (tsx's) environment before
 * that child even starts. A `NODE_OPTIONS=--require ...` line inside one of
 * those files would preload before any check written in this script -- this
 * file's own `assertNoLocalEnvFiles` included -- ever gets a chance to run,
 * for the same reason `env -i` closes the shell-preload variant below: a
 * `--require` preload always executes before the entry file's own code,
 * regardless of how the value reached the child's environment. A plain POSIX
 * shell script has no Node runtime to preload into, so it can safely gate
 * `vercel env run` itself; nothing written *inside* the eventual Node
 * process can.
 *
 * `vercel env run -e production` injects production environment variables
 * (including DATABASE_URL) directly into this process without ever writing
 * them to disk, unlike `vercel env pull`. `-e production` matters: a bare
 * pull/run without it targets Development.
 *
 * The final command invokes tsx directly, not `npm run db:seed:deploy`,
 * deliberately: preserving `HOME` (needed for `vercel`'s own auth/config
 * lookup) means `npm run` still reads the operator's `~/.npmrc` and this
 * project's `.npmrc`, and npm's own `node-options` config setting becomes
 * `NODE_OPTIONS` for the lifecycle script's child process -- reopening the
 * exact preload-injection vector below through npm's config file instead of
 * the shell. Reproduced: an `.npmrc` with `node-options=--require
 * dotenv/config` leaked a decoy `DATABASE_URL` through `npm run` even under
 * this same `env -i`. Invoking tsx directly skips npm's own config loading
 * entirely, so there is no lifecycle-script step for it to inject into.
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
 * injects DATABASE_URL before this script's code -- including
 * `assertNoLocalEnvFiles` below -- ever runs at all, since a `--require`
 * preload executes before the entry file loads. No script-side check can
 * close that: it runs too late by construction. `env -i` closes it at the
 * source by never letting the shell's `NODE_OPTIONS`
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
 * This check runs too late to catch a preload-based injection either from
 * the shell (env -i's job) or from a local .env* file's own content
 * (assert-no-local-env-files.sh's job, run before vercel env run even
 * starts) -- it exists as defense in depth for a normal execution path that
 * skipped one of those, not as the primary defense against either.
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
