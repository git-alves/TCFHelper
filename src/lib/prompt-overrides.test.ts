import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { findManyMock, upsertMock, deleteManyMock, transactionMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  upsertMock: vi.fn(),
  deleteManyMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    promptOverride: {
      findMany: findManyMock,
      upsert: upsertMock,
      deleteMany: deleteManyMock,
    },
    $transaction: transactionMock,
  },
}));

const {
  PROMPT_OVERRIDE_KEYS,
  PROMPT_OVERRIDE_DEFAULTS,
  getPromptOverrides,
  updatePromptOverrides,
  toCorrectionPromptOverrides,
} = await import("./prompt-overrides");

beforeEach(() => {
  findManyMock.mockReset();
  upsertMock.mockReset();
  deleteManyMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
});

describe("getPromptOverrides", () => {
  it("returns null for every key when no override rows exist", async () => {
    findManyMock.mockResolvedValue([]);

    const values = await getPromptOverrides();

    for (const key of PROMPT_OVERRIDE_KEYS) {
      expect(values[key]).toBeNull();
    }
  });

  it("fills in only the keys that have a stored override row", async () => {
    findManyMock.mockResolvedValue([{ key: "correctionTask1", value: "Custom Tache 1 rubric." }]);

    const values = await getPromptOverrides();

    expect(values.correctionTask1).toBe("Custom Tache 1 rubric.");
    expect(values.correctionBase).toBeNull();
  });

  it("ignores an unrecognized key from the database, since PROMPT_OVERRIDE_KEYS is the only trusted key set", async () => {
    findManyMock.mockResolvedValue([{ key: "somethingRemoved", value: "stale" }]);

    const values = await getPromptOverrides();

    expect(values).not.toHaveProperty("somethingRemoved");
  });
});

describe("updatePromptOverrides", () => {
  it("upserts a trimmed non-empty value", async () => {
    upsertMock.mockResolvedValue({ key: "correctionTask1", value: "Custom rubric." });
    findManyMock.mockResolvedValue([{ key: "correctionTask1", value: "Custom rubric." }]);

    await updatePromptOverrides({ correctionTask1: "  Custom rubric.  " });

    expect(upsertMock).toHaveBeenCalledWith({
      where: { key: "correctionTask1" },
      create: { key: "correctionTask1", value: "Custom rubric." },
      update: { value: "Custom rubric." },
    });
  });

  it("clears an override back to its default by deleting the row on an empty/blank value", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });
    findManyMock.mockResolvedValue([]);

    await updatePromptOverrides({ correctionTask1: "   " });

    expect(deleteManyMock).toHaveBeenCalledWith({ where: { key: "correctionTask1" } });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("leaves a key untouched when omitted from the patch", async () => {
    findManyMock.mockResolvedValue([]);

    await updatePromptOverrides({});

    expect(upsertMock).not.toHaveBeenCalled();
    expect(deleteManyMock).not.toHaveBeenCalled();
  });
});

describe("toCorrectionPromptOverrides", () => {
  it("maps every stored key to its buildCorrectionSystemPrompt field", () => {
    const mapped = toCorrectionPromptOverrides({
      correctionBase: "base",
      correctionTask1: "t1",
      correctionTask2: "t2",
      correctionTask3Documents: "t3d",
      correctionTask3Documentless: "t3nd",
    });

    expect(mapped).toEqual({
      base: "base",
      task1: "t1",
      task2: "t2",
      task3Documents: "t3d",
      task3Documentless: "t3nd",
    });
  });
});

describe("PROMPT_OVERRIDE_DEFAULTS", () => {
  it("has a non-empty built-in default for every editable key", () => {
    for (const key of PROMPT_OVERRIDE_KEYS) {
      expect(PROMPT_OVERRIDE_DEFAULTS[key].length).toBeGreaterThan(0);
    }
  });
});
