import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

// @prisma/nextjs-monorepo-workaround-plugin (wired up in next.config.ts) copies
// every file in the generated client directory whose name matches
// /schema\.prisma|engine/ next to each server bundle, regardless of whether
// anything actually requires it — Next's own `outputFileTracingExcludes`
// can't stop this, since the plugin writes straight into each bundle's
// .nft.json rather than going through Next's trace collection. Deleting the
// unused files here, after `prisma generate` and before `next build`, is the
// only way to keep them out of the 34 serverless function bundles.
//
// Vercel Lambda always runs the "rhel-openssl-3.0.x" engine (per
// binaryTargets in prisma/schema.prisma). The "native" target exists only so
// local dev/tests work on whatever platform they run on (e.g. linux-arm64
// here) and is never needed once the build is done.
const KEEP_ENGINE = "libquery_engine-rhel-openssl-3.0.x.so.node";
// query_engine_bg.{js,wasm} back the WASM query engine, only reachable via
// `@prisma/client/wasm` with a driver adapter configured. This app's
// PrismaClient (src/lib/prisma.ts) uses the default binary-engine import
// with no adapter, so these are always dead weight.
const EXTRA_UNUSED_FILES = ["query_engine_bg.js", "query_engine_bg.wasm"];
const CLIENT_DIRECTORIES = [join("node_modules", ".prisma", "client"), join("node_modules", "@prisma", "client")];

function pruneDirectory(directory) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    return;
  }

  for (const entry of readdirSync(directory)) {
    const isUnusedEngine = entry.startsWith("libquery_engine-") && entry.endsWith(".so.node") && entry !== KEEP_ENGINE;

    if (isUnusedEngine || EXTRA_UNUSED_FILES.includes(entry)) {
      const filePath = join(directory, entry);
      unlinkSync(filePath);
      console.log(`Pruned unused Prisma runtime file: ${filePath}`);
    }
  }
}

for (const directory of CLIENT_DIRECTORIES) {
  pruneDirectory(directory);
}
