import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, findManyMock, deleteManyMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
  deleteManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { essay: { findFirst: findFirstMock, findMany: findManyMock, deleteMany: deleteManyMock } },
}));

import { EssayStatus } from "@prisma/client";
import {
  deleteCorrectionForUser,
  getCorrectionForUser,
  getRecentCorrections,
  parseStoredEssayFeedback,
} from "./correction-history";

const feedback = {
  correctedText: "Je vais au marché.",
  modelVersion: "Je me rends au marché afin d'acheter des produits frais.",
  scores: {
    content: { score: 80, feedback: "The response answers the prompt." },
    linguistics: { score: 72, feedback: "Verb forms need attention." },
    vocabulary: { score: 76, feedback: "Vocabulary is appropriate." },
  },
  cefr: {
    estimatedLevel: "B2" as const,
    conservativeLevel: "B2" as const,
    confidence: "Medium" as const,
    rationale: "The text is clear and organized, but recurring verb-form errors limit accuracy.",
    evidence: "Clear organization and mostly accurate vocabulary throughout.",
    blocker: "Recurring verb-form errors limit accuracy.",
  },
  meetsWordCount: true,
  wordCountNote: "The response meets the target length.",
  errors: [
    {
      originalText: "Je va",
      originalStart: 0,
      correctedText: "Je vais",
      correctionStart: 0,
      explanation: "Use the first-person singular form.",
      errorType: "grammar" as const,
    },
  ],
  suggestions: ["Use more varied connectors."],
  summary: "A clear response with a small verb-form issue.",
};

function storedFeedback(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    level: feedback.cefr.conservativeLevel,
    feedbackLocale: "en",
    viewerLocale: "en",
    summary: feedback.summary,
    meetsWordCount: feedback.meetsWordCount,
    grammarNotes: {
      correctedText: feedback.correctedText,
      modelVersion: feedback.modelVersion,
      scores: feedback.scores,
      cefr: feedback.cefr,
      wordCountNote: feedback.wordCountNote,
      errors: feedback.errors,
    },
    suggestions: feedback.suggestions,
    ...overrides,
  } as unknown as Parameters<typeof parseStoredEssayFeedback>[0];
}

beforeEach(() => {
  findFirstMock.mockReset();
  findManyMock.mockReset();
  deleteManyMock.mockReset();
});

describe("parseStoredEssayFeedback", () => {
  it("reconstructs validated feedback from the persisted columns and JSON fields", () => {
    expect(parseStoredEssayFeedback(storedFeedback())).toEqual({
      feedback,
      feedbackLocale: "en",
      cefrAssessment: "current",
    });
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

  it("migrates a pre-hybrid-grid payload instead of degrading it to a limited summary", () => {
    const legacyGrammarNotes = {
      correctedText: feedback.correctedText,
      modelVersion: feedback.modelVersion,
      scores: feedback.scores,
      cefrRationale: "The text is clear and organized, but recurring verb-form errors limit accuracy.",
      wordCountNote: feedback.wordCountNote,
      errors: [
        {
          original: "Je va",
          originalStart: 0,
          correction: "Je vais",
          correctionStart: 0,
          explanation: "Use the first-person singular form.",
          category: "grammar",
        },
      ],
    };

    const migrated = parseStoredEssayFeedback(storedFeedback({ grammarNotes: legacyGrammarNotes }));

    expect(migrated).not.toBeNull();
    expect(migrated?.feedbackLocale).toBe("en");
    expect(migrated?.cefrAssessment).toBe("legacy");
    expect(migrated?.feedback.correctedText).toBe(feedback.correctedText);
    expect(migrated?.feedback.modelVersion).toBe(feedback.modelVersion);
    expect(migrated?.feedback.errors).toEqual(feedback.errors);
    expect(migrated?.feedback.cefr).toEqual({
      estimatedLevel: "B2",
      conservativeLevel: "B2",
      // Never fabricated: this correction predates confidence, evidence, and
      // blocker tracking, so confidence is honestly "Unknown" and evidence/
      // blocker point to the real rationale rather than duplicating it under
      // headings that would imply they were independently assessed. The
      // rationale itself is prefixed with a disclosure that the old schema
      // never distinguished a Demonstrated level from a verified Secure one.
      confidence: "Unknown",
      rationale:
        "This correction predates the Demonstrated/Secure level distinction — the level below is the single estimate recorded at the time, not a separately verified secure level. " +
        legacyGrammarNotes.cefrRationale,
      evidence: "Not recorded separately for this earlier correction — see the rationale above.",
      blocker: "Not recorded separately for this earlier correction — see the rationale above.",
    });
  });

  it("keeps a migrated legacy row's null feedbackLocale as null, never guessing it was English", () => {
    // The real historic content (rationale, corrected text, ...) could have
    // been generated in any locale the learner had selected at the time --
    // defaulting a missing feedbackLocale to English would make the modal
    // falsely claim the whole correction was generated in English for a
    // viewer in another language, when the truth is simply unknown.
    const migrated = parseStoredEssayFeedback(
      storedFeedback({
        feedbackLocale: null,
        grammarNotes: {
          correctedText: feedback.correctedText,
          modelVersion: feedback.modelVersion,
          scores: feedback.scores,
          cefrRationale: "Historic rationale.",
          wordCountNote: feedback.wordCountNote,
          errors: [],
        },
      }),
    );

    expect(migrated?.feedbackLocale).toBeNull();
  });

  it("generates the migration's own injected text in the viewer's current locale, regardless of the row's recorded locale", () => {
    const migratedForFrenchViewer = parseStoredEssayFeedback(
      storedFeedback({
        feedbackLocale: null,
        viewerLocale: "fr",
        grammarNotes: {
          correctedText: feedback.correctedText,
          modelVersion: feedback.modelVersion,
          scores: feedback.scores,
          cefrRationale: "Historic rationale.",
          wordCountNote: feedback.wordCountNote,
          errors: [],
        },
      }),
    );

    // Not guessed as null/English -- generated fresh in French, so it never
    // needs a "generated in another language" warning of its own.
    expect(migratedForFrenchViewer?.feedback.cefr.evidence).toContain(
      "Non enregistré séparément pour cette correction antérieure",
    );
    expect(migratedForFrenchViewer?.feedback.cefr.rationale).toContain(
      "Cette correction est antérieure à la distinction entre niveau démontré et niveau acquis",
    );
  });

  it("leaves a current-shape row's null feedbackLocale as null -- nothing was injected, so nothing needs disclosing", () => {
    const parsed = parseStoredEssayFeedback(storedFeedback({ feedbackLocale: null }));

    expect(parsed?.feedbackLocale).toBeNull();
  });

  it("classifies a current-shaped row with 'Unknown' confidence as legacy, not current", () => {
    // The live route's freshEssayFeedbackSchema should make this shape
    // impossible from a real correction, but shape alone isn't proof of
    // provenance -- confidence: "Unknown" itself says no consistency check
    // was ever performed, so the row must not get the Secure/Demonstrated
    // framing just because its JSON otherwise matches the current field names.
    const parsed = parseStoredEssayFeedback(
      storedFeedback({
        grammarNotes: {
          correctedText: feedback.correctedText,
          modelVersion: feedback.modelVersion,
          scores: feedback.scores,
          cefr: { ...feedback.cefr, confidence: "Unknown" },
          wordCountNote: feedback.wordCountNote,
          errors: feedback.errors,
        },
      }),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.cefrAssessment).toBe("legacy");
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

    const detail = await getCorrectionForUser("learner_1", "essay_1", "en");

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
    expect(detail).toMatchObject({
      kind: "complete",
      id: "essay_1",
      originalText: "Je va au marché.",
      feedback,
      feedbackLocale: "en",
    });
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

    await expect(getCorrectionForUser("learner_1", "essay_legacy", "en")).resolves.toMatchObject({
      kind: "limited",
      id: "essay_legacy",
      cefrLevel: "B2",
      summary: feedback.summary,
    });
  });

  it("does not reveal whether an unowned or missing essay exists", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(getCorrectionForUser("learner_1", "another_users_essay", "en")).resolves.toBeNull();
  });
});

describe("deleteCorrectionForUser", () => {
  it("deletes an owned, submitted, reviewed essay with an owner-scoped where clause", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteCorrectionForUser("learner_1", "essay_1")).resolves.toBe(true);

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        id: "essay_1",
        userId: "learner_1",
        status: EssayStatus.SUBMITTED,
        feedback: { is: {} },
      },
    });
  });

  it("returns false rather than throwing for an unowned or missing essay", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });

    await expect(deleteCorrectionForUser("learner_1", "another_users_essay")).resolves.toBe(false);
  });
});
