import { describe, expect, it } from "vitest";
import { essayFeedbackSchema, freshEssayFeedbackSchema } from "./essay-feedback";

const validFeedback = {
  correctedText: "Bonjour, je vais bien.",
  modelVersion: "Bonjour, je vais très bien. J’espère que vous allez bien aussi.",
  scores: {
    content: { score: 72, feedback: "The response addresses the prompt clearly." },
    linguistics: { score: 68, feedback: "Most sentence structures are accurate." },
    vocabulary: { score: 64, feedback: "Vocabulary is appropriate but could be more varied." },
  },
  cefr: {
    estimatedLevel: "B1",
    conservativeLevel: "B1",
    confidence: "Medium",
    rationale: "The response uses simple accurate sentences, but limited range keeps it below B2.",
    evidence: "Consistent, accurate use of present-tense verbs and everyday vocabulary.",
    blocker: "Limited sentence variety keeps it below B2.",
  },
  meetsWordCount: true,
  wordCountNote: "The response is within the target range.",
  errors: [
    {
      originalText: "je va",
      originalStart: 9,
      correctedText: "je vais",
      correctionStart: 9,
      explanation: "Use the first-person present form.",
      errorType: "grammar",
    },
  ],
  suggestions: ["Use a wider range of connectors."],
  summary: "A clear response with room to develop vocabulary.",
};

describe("essayFeedbackSchema", () => {
  it("accepts the score and model-version data required by the review modal", () => {
    expect(essayFeedbackSchema.safeParse(validFeedback).success).toBe(true);
  });

  it("rejects fractional and out-of-range score values", () => {
    const result = essayFeedbackSchema.safeParse({
      ...validFeedback,
      scores: {
        ...validFeedback.scores,
        content: { ...validFeedback.scores.content, score: 72.5 },
        linguistics: { ...validFeedback.scores.linguistics, score: 101 },
      },
    });

    expect(result.success).toBe(false);
  });

  it("requires a non-empty rationale for the CEFR estimate", () => {
    expect(
      essayFeedbackSchema.safeParse({ ...validFeedback, cefr: { ...validFeedback.cefr, rationale: "" } }).success,
    ).toBe(false);
    const withoutRationale = { ...validFeedback.cefr };
    Reflect.deleteProperty(withoutRationale, "rationale");
    expect(essayFeedbackSchema.safeParse({ ...validFeedback, cefr: withoutRationale }).success).toBe(false);
  });

  it("rejects a conservativeLevel higher than estimatedLevel", () => {
    const result = essayFeedbackSchema.safeParse({
      ...validFeedback,
      cefr: { ...validFeedback.cefr, estimatedLevel: "B2", conservativeLevel: "C1" },
    });

    expect(result.success).toBe(false);
  });

  it("accepts conservativeLevel equal to or lower than estimatedLevel", () => {
    expect(
      essayFeedbackSchema.safeParse({
        ...validFeedback,
        cefr: { ...validFeedback.cefr, estimatedLevel: "C1", conservativeLevel: "B2" },
      }).success,
    ).toBe(true);
    expect(
      essayFeedbackSchema.safeParse({
        ...validFeedback,
        cefr: { ...validFeedback.cefr, estimatedLevel: "C1", conservativeLevel: "C1" },
      }).success,
    ).toBe(true);
  });

  it("accepts 'Unknown' confidence, reserved for a migrated legacy correction", () => {
    expect(
      essayFeedbackSchema.safeParse({ ...validFeedback, cefr: { ...validFeedback.cefr, confidence: "Unknown" } })
        .success,
    ).toBe(true);
  });
});

describe("freshEssayFeedbackSchema", () => {
  it("accepts the same well-formed feedback essayFeedbackSchema does", () => {
    expect(freshEssayFeedbackSchema.safeParse(validFeedback).success).toBe(true);
  });

  it("rejects 'Unknown' confidence -- a live Gemini response must always resolve to a real level", () => {
    const result = freshEssayFeedbackSchema.safeParse({
      ...validFeedback,
      cefr: { ...validFeedback.cefr, confidence: "Unknown" },
    });

    expect(result.success).toBe(false);
  });
});
