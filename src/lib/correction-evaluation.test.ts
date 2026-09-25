import { describe, expect, it } from "vitest";
import {
  cefrLevelDistance,
  parseCorrectionEvaluationCases,
  summarizeCorrectionEvaluation,
  type CorrectionEvaluationCase,
} from "./correction-evaluation";

const cases: CorrectionEvaluationCase[] = [
  { id: "secure-b2", taskType: "TASK_1", topicPrompt: "Sujet", essay: "Texte", expected: { conservativeLevel: "B2" as const } },
  { id: "secure-c1", taskType: "TASK_2", topicPrompt: "Sujet", essay: "Texte", expected: { conservativeLevel: "C1" as const, estimatedLevel: "C2" as const } },
  { id: "secure-c2", taskType: "TASK_3", topicPrompt: "Sujet", essay: "Texte", expected: { conservativeLevel: "C2" as const } },
  { id: "c1-misclassified-as-b2", taskType: "TASK_2", topicPrompt: "Sujet", essay: "Texte", expected: { conservativeLevel: "C1" as const } },
];

describe("summarizeCorrectionEvaluation", () => {
  it("reports the C2-to-C1 regression separately from overall accuracy", () => {
    const summary = summarizeCorrectionEvaluation(cases, [
      { caseId: "secure-b2", feedback: { cefr: { conservativeLevel: "B2", estimatedLevel: "B2", confidence: "High", rationale: "x", evidence: "x", blocker: "x" } } },
      { caseId: "secure-c1", feedback: { cefr: { conservativeLevel: "C1", estimatedLevel: "C2", confidence: "High", rationale: "x", evidence: "x", blocker: "x" } } },
      { caseId: "secure-c2", feedback: { cefr: { conservativeLevel: "C1", estimatedLevel: "C2", confidence: "High", rationale: "x", evidence: "x", blocker: "x" } } },
      { caseId: "c1-misclassified-as-b2", feedback: { cefr: { conservativeLevel: "B2", estimatedLevel: "C1", confidence: "High", rationale: "x", evidence: "x", blocker: "x" } } },
    ]);

    expect(summary.conservativeAccuracy).toBeCloseTo(0.5);
    expect(summary.confusionMatrix.C2.C1).toBe(1);
    expect(summary.confusionMatrix.C1.B2).toBe(1);
    expect(summary.underClassifications).toBe(2);
    expect(summary.regressions).toEqual([
      { caseId: "secure-c2", expected: "C2", actual: "C1", direction: "under" },
      { caseId: "c1-misclassified-as-b2", expected: "C1", actual: "B2", direction: "under" },
    ]);
    expect(summary.estimatedExactMatches).toBe(1);
  });

  it("counts malformed or failed model calls as invalid instead of quietly treating them as wrong levels", () => {
    const summary = summarizeCorrectionEvaluation(cases, [{ caseId: "secure-b2", error: "invalid response" }]);

    expect(summary.validResponses).toBe(0);
    expect(summary.invalidResponses).toBe(4);
    expect(summary.conservativeAccuracy).toBeNull();
  });

  it("orders CEFR levels by proficiency, not alphabetically", () => {
    expect(cefrLevelDistance("C1", "B2")).toBe(1);
    expect(cefrLevelDistance("B2", "C1")).toBe(-1);
  });

  it("rejects duplicate IDs instead of silently mixing two benchmark cases", () => {
    expect(() =>
      parseCorrectionEvaluationCases([
        { ...cases[0] },
        { ...cases[0] },
      ]),
    ).toThrow("Duplicate correction evaluation case id: secure-b2");
  });
});
