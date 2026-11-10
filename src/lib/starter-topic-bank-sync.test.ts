import { beforeEach, describe, expect, it, vi } from "vitest";

const { runLockedStarterTopicBankSyncMock } = vi.hoisted(() => ({
  runLockedStarterTopicBankSyncMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/seed-topic-sync", () => ({ runLockedStarterTopicBankSync: runLockedStarterTopicBankSyncMock }));
vi.mock("@/lib/starter-topics", () => ({ STARTER_TOPICS: [], STARTER_TOPIC_BANK_VERSION: 1 }));

const { ensureStarterTopicBankSynced, resetStarterTopicBankSyncForTest } = await import("./starter-topic-bank-sync");

beforeEach(() => {
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
});
