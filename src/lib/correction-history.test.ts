import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, findManyMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { essay: { findFirst: findFirstMock, findMany: findManyMock } },
}));

import { EssayStatus } from "@prisma/client";
import { getCorrectionForUser, getRecentCorrections, parseStoredEssayFeedback } from "./correction-history";

const feedback = {
  correctedText: "Je vais au marché.",
  modelVersion: "Je me rends au marché afin d'acheter des produits frais.",
  scores: {
    content: { score: 80, feedback: "The response answers the prompt." },
    linguistics: { score: 72, feedback: "Verb forms need attention." },
    vocabulary: { score: 76, feedback: "Vocabulary is appropriate." },
  },
  cefrLevel: "B2" as const,
  cefrRationale: "The text is clear and organized, but recurring verb-form errors limit accuracy.",
  meetsWordCount: true,
  wordCountNote: "The response meets the target length.",
  errors: [
    {
      original: "Je va",
      originalStart: 0,
      correction: "Je vais",
      correctionStart: 0,
      explanation: "Use the first-person singular form.",
      category: "grammar" as const,
    },
  ],
  suggestions: ["Use more varied connectors."],
  summary: "A clear response with a small verb-form issue.",
};

function storedFeedback(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    level: feedback.cefrLevel,
    summary: feedback.summary,
    meetsWordCount: feedback.meetsWordCount,
    grammarNotes: {
      correctedText: feedback.correctedText,
      modelVersion: feedback.modelVersion,
      scores: feedback.scores,
      cefrRationale: feedback.cefrRationale,
      wordCountNote: feedback.wordCountNote,
      errors: feedback.errors,
    },
    suggestions: feedback.suggestions,
    ...overrides,
  };
}

beforeEach(() => {
  findFirstMock.mockReset();
  findManyMock.mockReset();
});

describe("parseStoredEssayFeedback", () => {
  it("reconstructs validated feedback from the persisted columns and JSON fields", () => {
    expect(parseStoredEssayFeedback(storedFeedback())).toEqual(feedback);
  });

  it("returns null instead of casting an older incomplete JSON payload", () => {
    expect(
      parseStoredEssayFeedback(
        storedFeedback({
          grammarNotes: { correctedText: feedback.correctedText },
        }),
      ),
    ).toBeNull();
  });
});

describe("getRecentCorrections", () => {
  it("reads only the signed-in learner's submitted corrections and omits essay text", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "essay_1",
        taskType: "TASK_2",
        wordCount: 140,
        createdAt: new Date("2026-08-07T12:00:00.000Z"),
        topic: { title: "Forum post" },
        feedback: {
          level: "B2",
          meetsWordCount: true,
          createdAt: new Date("2026-08-07T12:00:01.000Z"),
        },
      },
    ]);

    await expect(getRecentCorrections("learner_1")).resolves.toEqual([
      {
        id: "essay_1",
        taskType: "TASK_2",
        wordCount: 140,
        createdAt: "2026-08-07T12:00:00.000Z",
        assessedAt: "2026-08-07T12:00:01.000Z",
        cefrLevel: "B2",
        meetsWordCount: true,
        topicTitle: "Forum post",
      },
    ]);

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: "learner_1",
          status: EssayStatus.SUBMITTED,
          feedback: { is: {} },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: expect.not.objectContaining({ content: expect.anything() }),
      }),
    );
  });
});

describe("getCorrectionForUser", () => {
  it("uses an owner-scoped detail query and returns validated feedback", async () => {
    findFirstMock.mockResolvedValue({
      id: "essay_1",
      taskType: "TASK_1",
      content: "Je va au marché.",
      wordCount: 4,
      createdAt: new Date("2026-08-07T12:00:00.000Z"),
      topic: { title: "A message" },
      feedback: {
        ...storedFeedback(),
        createdAt: new Date("2026-08-07T12:00:01.000Z"),
      },
    });

    const detail = await getCorrectionForUser("learner_1", "essay_1");

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "essay_1",
          userId: "learner_1",
          status: EssayStatus.SUBMITTED,
          feedback: { is: {} },
        },
      }),
    );
    expect(detail).toMatchObject({ kind: "complete", id: "essay_1", originalText: "Je va au marché.", feedback });
  });

  it("returns an honest limited-details record when legacy feedback no longer matches the modal contract", async () => {
    findFirstMock.mockResolvedValue({
      id: "essay_legacy",
      taskType: "TASK_3",
      content: "Un texte historique.",
      wordCount: 3,
      createdAt: new Date("2026-08-06T12:00:00.000Z"),
      topic: null,
      feedback: {
        ...storedFeedback({ grammarNotes: { correctedText: feedback.correctedText } }),
        createdAt: new Date("2026-08-06T12:00:01.000Z"),
      },
    });

    await expect(getCorrectionForUser("learner_1", "essay_legacy")).resolves.toMatchObject({
      kind: "limited",
      id: "essay_legacy",
      cefrLevel: "B2",
      summary: feedback.summary,
    });
  });

  it("does not reveal whether an unowned or missing essay exists", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(getCorrectionForUser("learner_1", "another_users_essay")).resolves.toBeNull();
  });
});
