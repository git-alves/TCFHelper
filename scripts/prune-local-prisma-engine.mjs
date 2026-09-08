import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

// Vercel Lambda always runs the "rhel-openssl-3.0.x" engine (per
// binaryTargets in prisma/schema.prisma). The "native" target exists only so
// local dev/tests work on whatever platform they run on (e.g. linux-arm64
// here), but Next's file tracer has no way to tell them apart and copies
// both into every serverless function bundle. Deleting the non-Vercel
// engine(s) here, after `prisma generate` and before `next build`, keeps
// them out of the trace without touching schema.prisma.
const KEEP_ENGINE = "libquery_engine-rhel-openssl-3.0.x.so.node";
const CLIENT_DIRECTORIES = [join("node_modules", ".prisma", "client"), join("node_modules", "@prisma", "client")];

function pruneDirectory(directory) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    return;
  }

  for (const entry of readdirSync(directory)) {
    if (entry.startsWith("libquery_engine-") && entry.endsWith(".so.node") && entry !== KEEP_ENGINE) {
      const enginePath = join(directory, entry);
      unlinkSync(enginePath);
      console.log(`Pruned local-only Prisma engine: ${enginePath}`);
    }
  }
}

for (const directory of CLIENT_DIRECTORIES) {
  pruneDirectory(directory);
}
