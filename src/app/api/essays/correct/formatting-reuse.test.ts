// Round-trip regression for treating formatting-only edits as the same
// correction. Request-key equality alone is not enough: a reused result's
// error offsets index the text that was actually graded, so adding or
// removing an internal space shifts every later offset. This drives the real
// route, the real claim/dedup logic and the real history reader against an
// in-memory Prisma stand-in, and checks the reused result is read back
// against the stored original -- with its highlight still on the right text.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ERROR_CATEGORIES } from "@/lib/essay-feedback";

type Row = Record<string, unknown> & { id: string };

const { db, gradeEssayMock, reserveUsageMock } = vi.hoisted(() => ({
  db: {
    essays: [] as Row[],
    leases: new Map<string, { claimToken: string; expiresAt: Date }>(),
    nextId: 1,
  },
  gradeEssayMock: vi.fn(),
  reserveUsageMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/app-user", () => ({ AppUserProvisioningError: class extends Error {} }));
vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: async () => ({ id: "learner_1" }),
}));
vi.mock("@/lib/app-config", () => ({
  getAppConfig: async () => ({ correctionProvider: null, correctionApiKey: null, correctionModel: null }),
  resolveCorrectionProviderId: () => "gemini",
}));
vi.mock("@/lib/prompt-overrides", () => ({
  getPromptOverrides: async () => ({}),
  toCorrectionPromptOverrides: () => ({}),
}));
vi.mock("@/lib/correction-provider-registry", () => ({
  getCorrectionProvider: () => ({
    id: "gemini",
    hasConfiguredCredentials: () => true,
    gradeEssay: gradeEssayMock,
    resolveModel: () => "test-model",
  }),
}));
vi.mock("@/lib/correction-usage", () => ({
  reserveCorrectionUsage: reserveUsageMock,
}));
vi.mock("@/lib/admin-events", () => ({ recordAdminEvent: async () => undefined }));

vi.mock("@/lib/prisma", () => {
  const leaseKey = (where: { userId_correctionKeyHash: { userId: string; correctionKeyHash: string } }) =>
    `${where.userId_correctionKeyHash.userId}:${where.userId_correctionKeyHash.correctionKeyHash}`;

  // Only the predicates the claim and history reads actually use.
  const matches = (row: Row, where: Record<string, unknown>): boolean => {
    if (where.userId !== undefined && row.userId !== where.userId) return false;
    if (where.id !== undefined && row.id !== where.id) return false;
    if (where.status !== undefined && row.status !== where.status) return false;
    if (where.feedback !== undefined && !row.feedback) return false;
    const alternatives = where.OR as Record<string, unknown>[] | undefined;
    if (alternatives) {
      return alternatives.some(
        (alternative) =>
          alternative.correctionKeyHash !== undefined &&
          alternative.correctionKeyHash !== null &&
          row.correctionKeyHash === alternative.correctionKeyHash,
      );
    }
    return true;
  };

  const essay = {
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      db.essays.find((row) => matches(row, where)) ?? null,
    create: async ({ data }: { data: Record<string, unknown> & { feedback: { create: Record<string, unknown> } } }) => {
      const row: Row = {
        ...data,
        id: `essay_${db.nextId++}`,
        createdAt: new Date("2026-10-09T12:00:00.000Z"),
        topic: { title: "Écrivez à votre voisin." },
        feedback: { ...data.feedback.create, createdAt: new Date("2026-10-09T12:00:01.000Z") },
      };
      db.essays.push(row);
      return row;
    },
  };
  const tx = {
    $executeRaw: async () => 1,
    essay,
    topic: { create: async () => ({ id: "topic_1" }) },
    correctionLease: {
      findUnique: async ({ where }: { where: Parameters<typeof leaseKey>[0] }) =>
        db.leases.get(leaseKey(where)) ?? null,
      upsert: async ({
        where,
        create,
      }: {
        where: Parameters<typeof leaseKey>[0];
        create: { claimToken: string; expiresAt: Date };
      }) => {
        db.leases.set(leaseKey(where), { claimToken: create.claimToken, expiresAt: create.expiresAt });
      },
      deleteMany: async ({ where }: { where: { userId: string; correctionKeyHash: string } }) => {
        db.leases.delete(`${where.userId}:${where.correctionKeyHash}`);
        return { count: 1 };
      },
    },
  };

  return {
    prisma: {
      $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      essay,
    },
  };
});

const { POST } = await import("./route");
const { getCorrectionForUser } = await import("@/lib/correction-history");

const TOPIC = "Écrivez à votre voisin.";
const ERROR_WORD = "mot50";

// 62 words (just above the Task 1 minimum, so gluing two still passes it) with a doubled space early in the text, so
// every offset after it differs from the single-spaced version, and one
// error well after it.
const words = Array.from({ length: 62 }, (_, index) => `mot${index + 1}`);
const submitted = `${words.slice(0, 9).join(" ")}  ${words.slice(9).join(" ")}`;
const retyped = submitted.replace("  ", " ");
const errorStart = submitted.indexOf(ERROR_WORD);

function gradedFeedback() {
  return {
    correctedText: submitted,
    modelVersion: "Un modèle.",
    scores: {
      content: { score: 60, feedback: "ok" },
      linguistics: { score: 60, feedback: "ok" },
      vocabulary: { score: 60, feedback: "ok" },
    },
    cefr: {
      estimatedLevel: "B1",
      conservativeLevel: "B1",
      confidence: "Medium",
      rationale: "r",
      evidence: "e",
      blocker: "b",
    },
    meetsWordCount: true,
    wordCountNote: "ok",
    errors: [
      {
        originalText: ERROR_WORD,
        originalStart: errorStart,
        correctedText: `${ERROR_WORD}!`,
        correctionStart: null,
        explanation: "x",
        errorType: ERROR_CATEGORIES[0],
      },
    ],
    suggestions: ["s"],
    summary: "ok",
  };
}

function post(content: string) {
  return POST(
    new Request("http://localhost/api/essays/correct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskType: "TASK_1", topicPrompt: TOPIC, content }),
    }),
  );
}

beforeEach(() => {
  db.essays.length = 0;
  db.leases.clear();
  db.nextId = 1;
  gradeEssayMock.mockReset();
  gradeEssayMock.mockResolvedValue(gradedFeedback());
  reserveUsageMock.mockReset();
  reserveUsageMock.mockResolvedValue({ kind: "claimed" });
});

describe("reusing a correction after a formatting-only edit", () => {
  it("fixture shifts the error offset between the two spellings", () => {
    expect(retyped.indexOf(ERROR_WORD)).toBe(errorStart - 1);
    expect(retyped.slice(errorStart, errorStart + ERROR_WORD.length)).not.toBe(ERROR_WORD);
  });

  it("reuses the stored result, reads it back against the original text, and keeps the error on the right slice", async () => {
    const first = await post(submitted);
    expect(first.status).toBe(200);
    const { essayId } = (await first.json()) as { essayId: string };

    // Remove the double space and use a non-breaking space for another one --
    // spacing-only edits the learner would not consider a different answer.
    const second = await post(retyped.replace("mot20 mot21", "mot20 mot21"));
    expect(second.status).toBe(409);
    await expect(second.json()).resolves.toMatchObject({ code: "CORRECTION_ALREADY_EXISTS", essayId });
    // The duplicate is answered before any provider call or quota charge.
    expect(gradeEssayMock).toHaveBeenCalledTimes(1);
    expect(reserveUsageMock).toHaveBeenCalledTimes(1);
    expect(db.essays).toHaveLength(1);

    const detail = await getCorrectionForUser("learner_1", essayId, "en");
    if (detail?.kind !== "complete") throw new Error("expected a complete stored correction");
    // What the learner is shown is the text that was graded, not the new draft...
    expect(detail.originalText).toBe(submitted);
    // ...so every stored offset still lands on the error it describes.
    for (const error of detail.feedback.errors) {
      expect(typeof error.originalStart).toBe("number");
      const start = error.originalStart as number;
      expect(detail.originalText.slice(start, start + error.originalText.length)).toBe(error.originalText);
    }
    // And would NOT have, had the reused result been laid over the edited draft.
    expect(retyped.slice(errorStart, errorStart + ERROR_WORD.length)).not.toBe(ERROR_WORD);
  });

  it("still grades again when the learner deletes the space between two words", async () => {
    const first = await post(submitted);
    expect(first.status).toBe(200);

    const glued = submitted.replace("mot3 mot4", "mot3mot4");
    const second = await post(glued);

    expect(second.status).toBe(200);
    expect(gradeEssayMock).toHaveBeenCalledTimes(2);
    expect(db.essays).toHaveLength(2);
  });
});

describe("paragraph boundaries stay distinct", () => {
  it("grades again when a single line break becomes a paragraph break", async () => {
    const single = `${words.slice(0, 30).join(" ")}\n${words.slice(30).join(" ")}`;
    const double = single.replace("\n", "\n\n");

    expect((await post(single)).status).toBe(200);
    expect((await post(double)).status).toBe(200);
    expect(gradeEssayMock).toHaveBeenCalledTimes(2);
    expect(reserveUsageMock).toHaveBeenCalledTimes(2);
    expect(db.essays).toHaveLength(2);
  });
});
