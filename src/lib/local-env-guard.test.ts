import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { assertNoLocalEnvFiles } from "./local-env-guard";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "local-env-guard-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("assertNoLocalEnvFiles", () => {
  it("does not throw against a clean directory", () => {
    expect(() => assertNoLocalEnvFiles(dir, undefined)).not.toThrow();
  });

  it("throws when .env is present", () => {
    writeFileSync(join(dir, ".env"), "DATABASE_URL=postgres://decoy\n");

    expect(() => assertNoLocalEnvFiles(dir, undefined)).toThrow(/\.env\b/);
  });

  it("throws when .env.local is present", () => {
    writeFileSync(join(dir, ".env.local"), "DATABASE_URL=postgres://decoy\n");

    expect(() => assertNoLocalEnvFiles(dir, undefined)).toThrow(/\.env\.local/);
  });

  it("throws on the NODE_ENV=test pair Vercel CLI also loads", () => {
    writeFileSync(join(dir, ".env.test"), "DATABASE_URL=postgres://decoy\n");

    expect(() => assertNoLocalEnvFiles(dir, "test")).toThrow(/\.env\.test\b/);
  });

  it("throws on .env.test.local under NODE_ENV=test", () => {
    writeFileSync(join(dir, ".env.test.local"), "DATABASE_URL=postgres://decoy\n");

    expect(() => assertNoLocalEnvFiles(dir, "test")).toThrow(/\.env\.test\.local/);
  });

  it("checks an arbitrary inherited NODE_ENV's own pair, not just the three common values", () => {
    writeFileSync(join(dir, ".env.staging"), "DATABASE_URL=postgres://decoy\n");

    expect(() => assertNoLocalEnvFiles(dir, "staging")).toThrow(/\.env\.staging\b/);
  });

  it("does not flag an unrelated NODE_ENV's file when it is not present", () => {
    expect(() => assertNoLocalEnvFiles(dir, "test")).not.toThrow();
  });
});
