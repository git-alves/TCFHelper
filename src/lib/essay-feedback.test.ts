import { describe, expect, it } from "vitest";
import { essayFeedbackSchema } from "./essay-feedback";

const validFeedback = {
  correctedText: "Bonjour, je vais bien.",
  modelVersion: "Bonjour, je vais très bien. J’espère que vous allez bien aussi.",
  scores: {
    content: { score: 72, feedback: "The response addresses the prompt clearly." },
    linguistics: { score: 68, feedback: "Most sentence structures are accurate." },
    vocabulary: { score: 64, feedback: "Vocabulary is appropriate but could be more varied." },
  },
  cefrLevel: "B1",
  meetsWordCount: true,
  wordCountNote: "The response is within the target range.",
  errors: [
    {
      original: "je va",
      originalStart: 9,
      correction: "je vais",
      correctionStart: 9,
      explanation: "Use the first-person present form.",
      category: "grammar",
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
});
