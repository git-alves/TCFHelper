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

    await expect(runModelChain({
      section: "correction",
      steps: [{ provider: "gemini", model: "one", apiKey: null }, { provider: "openrouter", model: "two", apiKey: null }],
      budgetMs: 150_000, reserveStepTimeoutMs: 35_000, normalAttemptTimeoutMs: 45_000,
      invoke, onFailure: failed,
      isFallbackable: (error) => ({ error, status: (error as { status: number }).status, reasonCode: "upstream_http_error" }),
    })).resolves.toMatchObject({ value: "usable", reserve: true });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke.mock.calls[0]?.[1]).toMatchObject({ retry503: false, timeoutMs: 35_000 });
    expect(invoke.mock.calls[1]?.[1]).toMatchObject({ retry503: true, timeoutMs: 150_000, totalBudgetMs: 150_000 });
    expect(failed).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["correction", 150_000, 35_000, 45_000, 60_000],
    ["example", 75_000, 18_000, 20_000, 40_000],
  ] as const)("uses the remaining %s budget for a final answer after fast failures", async (section, budgetMs, reserveStepTimeoutMs, normalAttemptTimeoutMs, answerAfterMs) => {
    let now = 1_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockImplementation(() => now);
    const invoke = vi.fn().mockImplementation(async (_step, controls) => {
      if (invoke.mock.calls.length < 3) throw Object.assign(new Error("overloaded"), { status: 503 });
      expect(controls).toMatchObject({ timeoutMs: budgetMs, totalBudgetMs: budgetMs, retry503: true });
      now += answerAfterMs;
      return "long final answer";
    });
    const onFailure = vi.fn().mockResolvedValue(undefined);

    try {
      await expect(runModelChain({
        section,
        steps: [
          { provider: "gemini", model: "first", apiKey: null },
          { provider: "gemini", model: "second", apiKey: null },
          { provider: "openrouter", model: "final", apiKey: null },
        ],
        budgetMs,
        reserveStepTimeoutMs,
        normalAttemptTimeoutMs,
        invoke,
        onFailure,
        isFallbackable: (error) => ({ error, status: (error as { status?: number }).status, reasonCode: "upstream_http_error" }),
      })).resolves.toMatchObject({ value: "long final answer", reserve: true });
      expect(invoke.mock.calls[0]?.[1]).toMatchObject({ timeoutMs: reserveStepTimeoutMs, retry503: false });
      expect(invoke.mock.calls[1]?.[1]).toMatchObject({ timeoutMs: reserveStepTimeoutMs, retry503: false });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("keeps a one-step chain at its normal attempt timeout", async () => {
    const invoke = vi.fn().mockResolvedValue("answer");
    await runModelChain({
      section: "correction",
      steps: [{ provider: "gemini", model: "only", apiKey: null }],
      budgetMs: 150_000,
      reserveStepTimeoutMs: 35_000,
      normalAttemptTimeoutMs: 45_000,
      invoke,
      onFailure: vi.fn(),
      isFallbackable: () => null,
    });
    expect(invoke).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ timeoutMs: 45_000, totalBudgetMs: 150_000 }));
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
    await expect(runModelChain({
      section: "example",
      steps: [{ provider: "gemini", model: "first", apiKey: null }, { provider: "gemini", model: "second", apiKey: null }],
      budgetMs: 75_000, reserveStepTimeoutMs: 18_000, normalAttemptTimeoutMs: 20_000,
      invoke, onFailure,
      isFallbackable: (error) => ({ error, status: (error as { status?: number }).status, reasonCode }),
    })).resolves.toMatchObject({ value: "reserve answer", reserve: true });
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({ model: "first" }), expect.objectContaining({ reasonCode }));
  });
});
