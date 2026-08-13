import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getAppCopy } from "@/lib/app-copy";
import { essayFeedbackSchema } from "@/lib/essay-feedback";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import { CorrectionModal } from "./correction-modal";

const feedback = essayFeedbackSchema.parse({
  correctedText: "Je vais au marché demain.",
  modelVersion: "Demain, je me rendrai au marché pour faire mes courses.",
  scores: {
    content: { score: 84, feedback: "The response addresses the prompt clearly." },
    linguistics: { score: 72, feedback: "Verb forms need a little more care." },
    vocabulary: { score: 78, feedback: "Vocabulary is varied and appropriate." },
  },
  cefr: {
    estimatedLevel: "B1",
    conservativeLevel: "B1",
    confidence: "Medium",
    rationale: "The response communicates its idea clearly, but limited sentence variety keeps the estimate at B1.",
    evidence: "Clear communication with mostly accurate everyday vocabulary.",
    blocker: "Limited sentence variety keeps the estimate at B1.",
  },
  meetsWordCount: true,
  wordCountNote: "The response is within the target range.",
  errors: [
    {
      originalText: "Je va",
      originalStart: 0,
      correctedText: "Je vais",
      correctionStart: 0,
      explanation: "Use the first-person present form of aller.",
      errorType: "grammar",
    },
  ],
  suggestions: ["Add one concrete example."],
  summary: "A clear response with one verb-form issue to correct.",
});

function renderResultModal() {
  return renderToStaticMarkup(
    createElement(CorrectionModal, {
      open: true,
      state: "result",
      task: TASK_INSTRUCTIONS.TASK_2,
      submissionId: "essay_123",
      originalText: "Je va au marché demain.",
      feedback,
      feedbackLocale: "en",
      locale: "en",
      isStale: false,
      copy: getAppCopy("en"),
      onClose: () => undefined,
      onRetry: () => undefined,
    }),
  );
}

describe("CorrectionModal", () => {
  it("renders the returned submission ID, rationale, and clearly labelled learning visual", () => {
    const markup = renderResultModal();

    expect(markup).toContain("Submission ID: essay_123");
    expect(markup).toContain("Global performance");
    expect(markup).toContain("Overall learning indicator: 78%");
    expect(markup).toContain("Average of the three mytcflab learning indicators below.");
    expect(markup).toContain("mytcflab learning indicators - not official TCF.");
    expect(markup).toContain("Why this estimate");
    expect(markup).toContain("A requested C1/C2 study-example level is a target, not a verified result.");
    expect(markup).toContain("limited sentence variety keeps the estimate at B1");
    expect(markup).toContain("mytcflab generated model version");
    expect(markup).not.toContain("Mark as read this session");
    expect(markup).toContain("<svg");
  });

  it("uses an interactive disclosure card for each correction note", () => {
    const markup = renderResultModal();

    expect(markup).toContain("<details open");
    expect(markup).toContain("<summary");
    expect(markup).toContain("Error");
    expect(markup).toContain("Correction");
    expect(markup).toContain("Note:");
    expect(markup).toContain("Show or hide note");
  });
});
