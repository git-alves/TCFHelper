import { describe, expect, it, vi } from "vitest";

const { createMock, deleteManyMock, upsertMock, updateManyMock, findManyMock, groupByMock } = vi.hoisted(() => ({ createMock: vi.fn(), deleteManyMock: vi.fn(), upsertMock: vi.fn(), updateManyMock: vi.fn(), findManyMock: vi.fn(), groupByMock: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelChainAlert: { upsert: upsertMock, deleteMany: deleteManyMock, updateMany: updateManyMock, findMany: findManyMock },
    modelChainReserveUse: { create: createMock, groupBy: groupByMock },
  },
}));

const { parseModelChain, runModelChain, openModelChainAlert, clearModelChainAlert, dismissModelChainAlert, getModelChainAdminStatus } = await import("./model-chain");

describe("model fallback chain", () => {
  it("includes each alert's read-only job section in the admin display", async () => {
    findManyMock.mockResolvedValue([{ id: "alert_1", section: "example", provider: "gemini", model: "model", kind: "key" }]);
    groupByMock.mockResolvedValue([]);

    await expect(getModelChainAdminStatus()).resolves.toMatchObject({ alerts: [{ id: "alert_1", section: "example" }] });
  });
  it("opens credit and Gemini invalid-key alerts, clears on success, and dismisses", async () => {
    const step = { provider: "gemini" as const, model: "gemini-3.5-flash", apiKey: null };
    await openModelChainAlert("correction", step, 402);
    await openModelChainAlert("correction", step, 400);
    expect(upsertMock).toHaveBeenLastCalledWith(expect.objectContaining({ create: expect.objectContaining({ kind: "key" }) }));
    await clearModelChainAlert("correction", step);
    expect(deleteManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ section: "correction" }) }));
    await dismissModelChainAlert("c123456789012345678901234");
    expect(updateManyMock).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ dismissedAt: expect.any(Date) }) }));
  });
  it("tries each reserve step once and returns the next usable result", async () => {
    const invoke = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("overloaded"), { status: 503 }))
      .mockResolvedValueOnce("usable");
    const failed = vi.fn().mockResolvedValue(undefined);
    const recovered = vi.fn().mockResolvedValue(undefined);

    await expect(runModelChain({
      section: "correction",
      steps: [{ provider: "gemini", model: "one", apiKey: null }, { provider: "openrouter", model: "two", apiKey: null }],
      budgetMs: 150_000, reserveStepTimeoutMs: 35_000, normalAttemptTimeoutMs: 45_000,
      invoke, onFailure: failed, onRecovered: recovered,
      isFallbackable: (error) => ({ error, status: (error as { status: number }).status, reasonCode: "upstream_http_error" }),
    })).resolves.toMatchObject({ value: "usable", reserve: true });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[0]?.[1]).toMatchObject({ retry503: false, timeoutMs: 35_000 });
    expect(invoke.mock.calls[1]?.[1]).toMatchObject({ retry503: true });
    expect(failed).not.toHaveBeenCalled();
    expect(recovered).toHaveBeenCalledWith(
      [expect.objectContaining({ step: expect.objectContaining({ model: "one" }) })],
      expect.objectContaining({ model: "two" }),
    );
  });

  it("keeps malformed stored chains disabled so legacy behavior is selected", () => {
    expect(parseModelChain([{ provider: "not-a-provider", model: "x" }])).toBeNull();
    expect(parseModelChain([{ provider: "gemini", model: "x", apiKey: null }])).toEqual([{ provider: "gemini", model: "x", apiKey: null }]);
  });

  it.each([
    ["credits exhausted", 402, "upstream_http_error"],
    ["invalid key", 401, "upstream_http_error"],
    ["timeout transport", undefined, "transport_error"],
    ["invalid structured answer", undefined, "schema_invalid"],
  ])("moves on after %s", async (_label, status, reasonCode) => {
    const invoke = vi.fn().mockRejectedValueOnce(Object.assign(new Error(reasonCode), status === undefined ? {} : { status })).mockResolvedValueOnce("reserve answer");
    const onFailure = vi.fn().mockResolvedValue(undefined);
    const onRecovered = vi.fn().mockResolvedValue(undefined);
    await expect(runModelChain({
      section: "example",
      steps: [{ provider: "gemini", model: "first", apiKey: null }, { provider: "gemini", model: "second", apiKey: null }],
      budgetMs: 75_000, reserveStepTimeoutMs: 18_000, normalAttemptTimeoutMs: 20_000,
      invoke, onFailure, onRecovered,
      isFallbackable: (error) => ({ error, status: (error as { status?: number }).status, reasonCode }),
    })).resolves.toMatchObject({ value: "reserve answer", reserve: true });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(onFailure).not.toHaveBeenCalled();
    expect(onRecovered).toHaveBeenCalledWith(
      [expect.objectContaining({ step: expect.objectContaining({ model: "first" }), failure: expect.objectContaining({ reasonCode }) })],
      expect.objectContaining({ model: "second" }),
    );
  });

  it("holds failures until every chain step has failed", async () => {
    const onFailure = vi.fn().mockResolvedValue(undefined);
    await expect(runModelChain({
      section: "correction",
      steps: [{ provider: "gemini", model: "one", apiKey: null }, { provider: "openrouter", model: "two", apiKey: null }],
      budgetMs: 150_000, reserveStepTimeoutMs: 35_000, normalAttemptTimeoutMs: 45_000,
      invoke: vi.fn().mockRejectedValue(Object.assign(new Error("down"), { status: 503 })),
      onFailure,
      isFallbackable: (error) => ({ error, status: (error as { status: number }).status, reasonCode: "upstream_http_error" }),
    })).rejects.toThrow("down");
    expect(onFailure).toHaveBeenCalledTimes(2);
  });

  it("returns a recovered answer when recovery logging throws", async () => {
    const invoke = vi.fn().mockRejectedValueOnce(Object.assign(new Error("down"), { status: 503 })).mockResolvedValueOnce("answer");
    await expect(runModelChain({
      section: "example",
      steps: [{ provider: "gemini", model: "one", apiKey: null }, { provider: "openrouter", model: "two", apiKey: null }],
      budgetMs: 75_000, reserveStepTimeoutMs: 18_000, normalAttemptTimeoutMs: 20_000,
      invoke,
      onFailure: vi.fn(),
      onRecovered: vi.fn().mockRejectedValue(new Error("log unavailable")),
      isFallbackable: (error) => ({ error, status: (error as { status: number }).status, reasonCode: "upstream_http_error" }),
    })).resolves.toMatchObject({ value: "answer", reserve: true });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("returns a recovered answer when recovery logging throws synchronously", async () => {
    const invoke = vi.fn().mockRejectedValueOnce(Object.assign(new Error("down"), { status: 503 })).mockResolvedValueOnce("answer");
    await expect(runModelChain({
      section: "example",
      steps: [{ provider: "gemini", model: "one", apiKey: null }, { provider: "openrouter", model: "two", apiKey: null }],
      budgetMs: 75_000, reserveStepTimeoutMs: 18_000, normalAttemptTimeoutMs: 20_000,
      invoke,
      onFailure: vi.fn(),
      onRecovered: () => {
        throw new Error("sync log unavailable");
      },
      isFallbackable: (error) => ({ error, status: (error as { status: number }).status, reasonCode: "upstream_http_error" }),
    })).resolves.toMatchObject({ value: "answer", reserve: true });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("writes buffered failures before rethrowing a non-fallbackable error", async () => {
    const first = Object.assign(new Error("recoverable"), { status: 503 });
    const fatal = new Error("fatal");
    const onFailure = vi.fn().mockResolvedValue(undefined);
    await expect(runModelChain({
      section: "correction",
      steps: [{ provider: "gemini", model: "one", apiKey: null }, { provider: "openrouter", model: "two", apiKey: null }],
      budgetMs: 150_000, reserveStepTimeoutMs: 35_000, normalAttemptTimeoutMs: 45_000,
      invoke: vi.fn().mockRejectedValueOnce(first).mockRejectedValueOnce(fatal),
      onFailure,
      isFallbackable: (error) => error === first ? { error, status: 503, reasonCode: "upstream_http_error" } : null,
    })).rejects.toThrow("fatal");
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ model: "one" }), expect.objectContaining({ reasonCode: "upstream_http_error" }));
  });
});
