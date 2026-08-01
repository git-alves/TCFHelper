import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, upsertMock, executeRawMock, transactionMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  upsertMock: vi.fn(),
  executeRawMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    translationFallbackCircuit: { findUnique: findUniqueMock, upsert: upsertMock },
    $transaction: transactionMock,
  },
}));

const { isFallbackCircuitOpen, recordFallbackFailure, recordFallbackSuccess } = await import(
  "./translation-fallback-circuit"
);

const CIRCUIT_ID = "unofficial-translate-scraper";

beforeEach(() => {
  findUniqueMock.mockReset();
  upsertMock.mockReset();
  executeRawMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      $executeRaw: executeRawMock,
      translationFallbackCircuit: { findUnique: findUniqueMock, upsert: upsertMock },
    }),
  );
});

describe("isFallbackCircuitOpen", () => {
  it("is closed when there is no row yet", async () => {
    findUniqueMock.mockResolvedValue(null);
    await expect(isFallbackCircuitOpen()).resolves.toBe(false);
  });

  it("is closed once openUntil has passed", async () => {
    findUniqueMock.mockResolvedValue({
      id: CIRCUIT_ID,
      consecutiveFailures: 5,
      openUntil: new Date("2026-08-01T00:00:00.000Z"),
    });

    await expect(isFallbackCircuitOpen(new Date("2026-08-01T00:00:01.000Z"))).resolves.toBe(false);
  });

  it("is open while openUntil is in the future", async () => {
    findUniqueMock.mockResolvedValue({
      id: CIRCUIT_ID,
      consecutiveFailures: 5,
      openUntil: new Date("2026-08-01T00:10:00.000Z"),
    });

    await expect(isFallbackCircuitOpen(new Date("2026-08-01T00:00:00.000Z"))).resolves.toBe(true);
  });
});

describe("recordFallbackFailure", () => {
  it("increments consecutive failures without opening the circuit below the threshold", async () => {
    findUniqueMock.mockResolvedValue({ id: CIRCUIT_ID, consecutiveFailures: 2, openUntil: null });

    await recordFallbackFailure(new Date("2026-08-01T00:00:00.000Z"));

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: CIRCUIT_ID },
      create: { id: CIRCUIT_ID, consecutiveFailures: 3, openUntil: null },
      update: { consecutiveFailures: 3, openUntil: null },
    });
    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
  });

  it("opens the circuit for a cooldown once the failure threshold is reached", async () => {
    findUniqueMock.mockResolvedValue({ id: CIRCUIT_ID, consecutiveFailures: 4, openUntil: null });

    await recordFallbackFailure(new Date("2026-08-01T00:00:00.000Z"));

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: CIRCUIT_ID },
      create: { id: CIRCUIT_ID, consecutiveFailures: 5, openUntil: new Date("2026-08-01T00:10:00.000Z") },
      update: { consecutiveFailures: 5, openUntil: new Date("2026-08-01T00:10:00.000Z") },
    });
  });
});

describe("recordFallbackSuccess", () => {
  it("resets the failure count and closes the circuit", async () => {
    await recordFallbackSuccess();

    expect(upsertMock).toHaveBeenCalledWith({
      where: { id: CIRCUIT_ID },
      create: { id: CIRCUIT_ID, consecutiveFailures: 0, openUntil: null },
      update: { consecutiveFailures: 0, openUntil: null },
    });
  });
});
