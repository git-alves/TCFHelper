import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

const root = process.cwd();
const sandbox = mkdtempSync(path.join(tmpdir(), "tcfhelper-db-test-"));
const packageDir = path.join(sandbox, "packages");
const dataDir = path.join(sandbox, "postgres");
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close((error) => error ? reject(error) : resolve(address.port));
  });
});
let pg;
let cleaned = false;
async function cleanup() {
  if (cleaned) return;
  cleaned = true;
  if (pg) await pg.stop().catch(() => undefined);
  rmSync(sandbox, { recursive: true, force: true });
}
process.once("SIGINT", () => { void cleanup().finally(() => process.exit(130)); });

// Keep the ~60 MB platform binary out of the repository's devDependencies.
// npm installs it only for this explicit opt-in test command.
try {
  execFileSync("npm", ["install", "--no-save", "--prefix", packageDir, "embedded-postgres"], { stdio: "inherit" });
  const { default: EmbeddedPostgres } = await import(path.join(packageDir, "node_modules/embedded-postgres/dist/index.js"));
  pg = new EmbeddedPostgres({
    databaseDir: dataDir, port, user: "postgres", password: "postgres", persistent: false,
    autoRehydrateSymlinks: true, onLog: () => undefined,
  });
  const databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?schema=public`;
  await pg.initialise();
  await pg.start();
  for (const args of [["prisma", "migrate", "deploy"], ["vitest", "run", "--config", "vitest.db.config.mts"]]) {
    const result = spawnSync("npx", args, { cwd: root, stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl, VERCEL_ENV: "production", RUN_DB_TESTS: "1", TCFHELPER_DB_TEST_SCRATCH: "1", TCFHELPER_DB_TEST_PORT: String(port) } });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    if (process.exitCode) break;
  }
} finally {
  await cleanup();
}
