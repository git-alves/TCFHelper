import { readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

const [outputDirectory] = process.argv.slice(2);
const ENGINE_FILE = "libquery_engine-rhel-openssl-3.0.x.so.node";

if (!outputDirectory) {
  throw new Error("Usage: node scripts/verify-prisma-engine.mjs <output-directory>");
}

function findFile(directory, filename) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);

    if (entry.isFile() && entry.name === filename) {
      return entryPath;
    }

    if (entry.isDirectory()) {
      const match = findFile(entryPath, filename);
      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

const resolvedOutputDirectory = resolve(outputDirectory);
const enginePath = findFile(resolvedOutputDirectory, ENGINE_FILE);

if (!enginePath) {
  throw new Error(
    `Prisma query engine for rhel-openssl-3.0.x is missing from ${resolvedOutputDirectory}.`
  );
}

console.log(`Found Prisma query engine: ${relative(process.cwd(), enginePath)}`);
