import { describe, expect, it, vi } from "vitest";

const { createMock, deleteManyMock, upsertMock } = vi.hoisted(() => ({ createMock: vi.fn(), deleteManyMock: vi.fn(), upsertMock: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelChainAlert: { upsert: upsertMock, deleteMany: deleteManyMock },
    modelChainReserveUse: { create: createMock },
  },
}));

const { parseModelChain, runModelChain } = await import("./model-chain");

describe("model fallback chain", () => {
  it("tries each reserve step once and returns the next usable result", async () => {
    const invoke = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("overloaded"), { status: 503 }))
      .mockResolvedValueOnce("usable");
    const failed = vi.fn().mockResolvedValue(undefined);

    await expect(runModelChain({
      section: "correction",
      steps: [{ provider: "gemini", model: "one", apiKey: null }, { provider: "openrouter", model: "two", apiKey: null }],
      legacy: false, budgetMs: 150_000, reserveStepTimeoutMs: 35_000, normalAttemptTimeoutMs: 45_000,
      invoke, onFailure: failed,
      isFallbackable: (error) => ({ error, status: (error as { status: number }).status, reasonCode: "upstream_http_error" }),
    })).resolves.toMatchObject({ value: "usable", reserve: true });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[0]?.[1]).toMatchObject({ retry503: false, timeoutMs: 35_000 });
    expect(invoke.mock.calls[1]?.[1]).toMatchObject({ retry503: true });
    expect(failed).toHaveBeenCalledTimes(1);
  });

  it("keeps malformed stored chains disabled so legacy behavior is selected", () => {
    expect(parseModelChain([{ provider: "not-a-provider", model: "x" }])).toBeNull();
    expect(parseModelChain([{ provider: "gemini", model: "x", apiKey: null }])).toEqual([{ provider: "gemini", model: "x", apiKey: null }]);
  });
});
