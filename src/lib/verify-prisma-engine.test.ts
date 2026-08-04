import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const ENGINE_FILE = "libquery_engine-rhel-openssl-3.0.x.so.node";
const SCHEMA_FILE = "schema.prisma0";
const verifierPath = resolve(process.cwd(), "scripts/verify-prisma-engine.mjs");
const temporaryDirectories: string[] = [];

function createFunctionFixture(includeSchema = true) {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), "mytcflab-prisma-runtime-"));
  temporaryDirectories.push(fixtureDirectory);

  const chunkDirectory = join(fixtureDirectory, ".next", "server", "chunks");
  mkdirSync(chunkDirectory, { recursive: true });
  writeFileSync(join(chunkDirectory, "889.js"), `const engine = "${ENGINE_FILE}";`);
  writeFileSync(join(chunkDirectory, ENGINE_FILE), "engine");

  if (includeSchema) {
    writeFileSync(join(chunkDirectory, SCHEMA_FILE), "schema");
  }

  const functionDirectory = join(
    fixtureDirectory,
    ".vercel",
    "output",
    "functions",
    "api",
    "auth",
    "signup.func"
  );
  mkdirSync(functionDirectory, { recursive: true });
  writeFileSync(
    join(functionDirectory, ".vc-config.json"),
    JSON.stringify({
      filePathMap: {
        ".next/server/chunks/889.js": ".next/server/chunks/889.js",
        [`.next/server/chunks/${ENGINE_FILE}`]: `.next/server/chunks/${ENGINE_FILE}`,
        ...(includeSchema
          ? { [`.next/server/chunks/${SCHEMA_FILE}`]: `.next/server/chunks/${SCHEMA_FILE}` }
          : {}),
      },
    })
  );

  return fixtureDirectory;
}

function runVerifier(fixtureDirectory: string) {
  return spawnSync(
    process.execPath,
    [verifierPath, ".vercel/output/functions"],
    { cwd: fixtureDirectory, encoding: "utf8" }
  );
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("verify-prisma-engine", () => {
  it("accepts a Vercel function that maps the runtime beside its Prisma chunk", () => {
    const result = runVerifier(createFunctionFixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Found Prisma runtime mappings for 1 bundled file");
  });

  it("rejects a Vercel function missing the generated schema next to its Prisma chunk", () => {
    const result = runVerifier(createFunctionFixture(false));

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".next/server/chunks/schema.prisma0");
  });
});
