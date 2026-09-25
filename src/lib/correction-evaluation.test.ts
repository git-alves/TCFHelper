import { describe, expect, it } from "vitest";
import {
  cefrLevelDistance,
  correctionPromptOverridesFingerprint,
  modalCorrectionEvaluationOutputs,
  parseCorrectionEvaluationCases,
  parseCorrectionPromptOverrides,
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
    expect(summary.conservativeAccuracy).toBe(0);
    expect(summary.validResponseConservativeAccuracy).toBeNull();
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

  it("records an equivalent prompt snapshot identically and rejects unknown prompt inputs", () => {
    const overrides = parseCorrectionPromptOverrides({ base: "  CUSTOM {{feedbackLanguage}}  ", task1: null });

    expect(correctionPromptOverridesFingerprint(overrides)).toBe(
      correctionPromptOverridesFingerprint({ base: "CUSTOM {{feedbackLanguage}}", task1: null }),
    );
    expect(() => parseCorrectionPromptOverrides({ base: "valid", surprise: "ignored" })).toThrow();
  });

  it("treats an unstable repeated CEFR result as invalid instead of choosing a level arbitrarily", () => {
    const feedback = (conservativeLevel: "B2" | "C1") => ({
      cefr: { conservativeLevel, estimatedLevel: conservativeLevel, confidence: "High" as const, rationale: "x", evidence: "x", blocker: "x" },
    });
    const modal = modalCorrectionEvaluationOutputs([cases[0]], [
      [{ caseId: "secure-b2", feedback: feedback("B2") }],
      [{ caseId: "secure-b2", feedback: feedback("C1") }],
    ]);

    expect(modal).toEqual([
      { caseId: "secure-b2", error: "No CEFR result was returned by a strict majority of repeated calls." },
    ]);
  });

  it("treats one valid result among mostly-failed repeats as invalid, not a confident 100% modal match", () => {
    const feedback = {
      cefr: { conservativeLevel: "B2" as const, estimatedLevel: "B2" as const, confidence: "High" as const, rationale: "x", evidence: "x", blocker: "x" },
    };
    const modal = modalCorrectionEvaluationOutputs([cases[0]], [
      [{ caseId: "secure-b2", feedback }],
      [{ caseId: "secure-b2", error: "upstream_http_error" }],
      [{ caseId: "secure-b2", error: "transport_error" }],
    ]);

    expect(modal).toEqual([
      { caseId: "secure-b2", error: "No CEFR result was returned by a strict majority of repeated calls." },
    ]);
  });

  it("still accepts a genuine strict majority even with one failed repeat", () => {
    const feedback = {
      cefr: { conservativeLevel: "B2" as const, estimatedLevel: "B2" as const, confidence: "High" as const, rationale: "x", evidence: "x", blocker: "x" },
    };
    const modal = modalCorrectionEvaluationOutputs([cases[0]], [
      [{ caseId: "secure-b2", feedback }],
      [{ caseId: "secure-b2", feedback }],
      [{ caseId: "secure-b2", error: "transport_error" }],
    ]);

    expect(modal).toEqual([{ caseId: "secure-b2", feedback }]);
  });
});
