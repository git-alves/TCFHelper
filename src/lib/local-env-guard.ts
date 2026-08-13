import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Names Vercel CLI's `env run`/`env pull` load from the working directory,
 * merged over the fetched environment: `.env`/`.env.local` always, plus
 * `.env.development(.local)` by default or `.env.test(.local)` under
 * `NODE_ENV=test` -- the only two pairs the installed CLI actually switches
 * on (verified against v58.11.0).
 */
const BASE_LOCAL_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
];

/**
 * Also checks the inherited `NODE_ENV`'s own `.env.<value>` pair even for a
 * value the installed CLI does not itself special-case (only `test` is
 * currently documented to switch the pair; anything else falls back to the
 * development pair, already in BASE_LOCAL_ENV_FILES). This is deliberately
 * more conservative than that known CLI behavior, not a claim about it: a
 * future CLI version adding another special-cased value costs nothing extra
 * to already be covered here.
 */
function localEnvFileCandidates(nodeEnv: string | undefined): string[] {
  const files = new Set(BASE_LOCAL_ENV_FILES);

  if (nodeEnv) {
    files.add(`.env.${nodeEnv}`);
    files.add(`.env.${nodeEnv}.local`);
  }

  return [...files];
}

/**
 * Throws if any file `vercel env run`/`env pull` would load from `cwd`
 * exists, since those silently override the environment Vercel's CLI just
 * fetched (see scripts/deploy-seed-topics.ts's header comment for the full
 * three-layer precedence this guards one layer of).
 */
export function assertNoLocalEnvFiles(cwd: string = process.cwd(), nodeEnv: string | undefined = process.env.NODE_ENV) {
  const found = localEnvFileCandidates(nodeEnv).filter((file) => existsSync(join(cwd, file)));

  if (found.length > 0) {
    throw new Error(
      `Refusing to run with local env file(s) present in the working directory: ${found.join(", ")}. ` +
        "vercel env run's own precedence lets these silently override the fetched production DATABASE_URL. " +
        "Run from a clean checkout/worktree with no .env* files.",
    );
  }
}
