import { beforeEach, describe, expect, it, vi } from "vitest";

const { runLockedStarterTopicBankSyncMock } = vi.hoisted(() => ({
  runLockedStarterTopicBankSyncMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/seed-topic-sync", () => ({ runLockedStarterTopicBankSync: runLockedStarterTopicBankSyncMock }));
vi.mock("@/lib/starter-topics", () => ({ STARTER_TOPICS: [], STARTER_TOPIC_BANK_VERSION: 1 }));

const { ensureStarterTopicBankSynced, resetStarterTopicBankSyncForTest } = await import("./starter-topic-bank-sync");

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("VERCEL_ENV", "production");
  resetStarterTopicBankSyncForTest();
  runLockedStarterTopicBankSyncMock.mockReset();
});

describe("ensureStarterTopicBankSynced", () => {
  it("shares one sync among concurrent cold-start requests and caches success", async () => {
    let release!: () => void;
    runLockedStarterTopicBankSyncMock.mockImplementation(
      () => new Promise<void>((resolve) => { release = resolve; }),
    );

    const first = ensureStarterTopicBankSynced();
    const second = ensureStarterTopicBankSynced();
    expect(runLockedStarterTopicBankSyncMock).toHaveBeenCalledOnce();

    release();
    await Promise.all([first, second]);
    await ensureStarterTopicBankSynced();
    expect(runLockedStarterTopicBankSyncMock).toHaveBeenCalledOnce();
  });

  it("logs a failure but resolves so callers can serve the existing active bank", async () => {
    const error = new Error("database unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    runLockedStarterTopicBankSyncMock.mockRejectedValue(error);

    await expect(ensureStarterTopicBankSynced()).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      "Starter-topic bank synchronization failed; serving the existing topic bank.",
      error,
    );
  });

  it("is a no-op in a Vercel Preview and does not touch the database sync", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await expect(ensureStarterTopicBankSynced()).resolves.toBeUndefined();

    expect(runLockedStarterTopicBankSyncMock).not.toHaveBeenCalled();
    expect(consoleInfo).toHaveBeenCalledWith("Skipping starter-topic bank synchronization in Vercel preview.");
  });

  it("requires an explicit local opt-in when VERCEL_ENV is unset", async () => {
    vi.unstubAllEnvs();
    const consoleInfo = vi.spyOn(console, "info").mockImplementation(() => undefined);

    await ensureStarterTopicBankSynced();

    expect(runLockedStarterTopicBankSyncMock).not.toHaveBeenCalled();
    expect(consoleInfo).toHaveBeenCalledWith(
      "Skipping starter-topic bank synchronization outside Vercel production; set AUTO_SYNC_STARTER_TOPICS=1 to opt in locally.",
    );
  });

  it("allows an explicitly opted-in local sync when VERCEL_ENV is unset", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("AUTO_SYNC_STARTER_TOPICS", "1");
    runLockedStarterTopicBankSyncMock.mockResolvedValue({ status: "unchanged" });

    await ensureStarterTopicBankSynced();

    expect(runLockedStarterTopicBankSyncMock).toHaveBeenCalledOnce();
  });
});
