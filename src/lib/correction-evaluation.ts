import { CEFR_LEVELS, type EssayFeedback } from "@/lib/essay-feedback";
import { z } from "zod";

export type CefrLevel = (typeof CEFR_LEVELS)[number];

export interface CorrectionEvaluationExpectedResult {
  /** The independently adjudicated secure CEFR level. This is the primary metric. */
  conservativeLevel: CefrLevel;
  /** Optional when reviewers also agreed on the highest intermittently demonstrated level. */
  estimatedLevel?: CefrLevel;
}

export interface CorrectionEvaluationCase {
  id: string;
  taskType: "TASK_1" | "TASK_2" | "TASK_3";
  topicPrompt: string;
  essay: string;
  /** Defaults to English so the feedback language cannot become a hidden experiment variable. */
  feedbackLanguage?: string;
  expected: CorrectionEvaluationExpectedResult;
  /** Short human context, never sent to a model. */
  notes?: string;
}

const correctionEvaluationCaseSchema = z.object({
  id: z.string().min(1),
  taskType: z.enum(["TASK_1", "TASK_2", "TASK_3"]),
  topicPrompt: z.string().min(1),
  essay: z.string().min(1),
  feedbackLanguage: z.string().min(1).optional(),
  expected: z.object({
    conservativeLevel: z.enum(CEFR_LEVELS),
    estimatedLevel: z.enum(CEFR_LEVELS).optional(),
  }),
  notes: z.string().optional(),
});

/** Parses a hand-labelled JSON evaluation set and rejects duplicate case IDs. */
export function parseCorrectionEvaluationCases(value: unknown): CorrectionEvaluationCase[] {
  const cases = z.array(correctionEvaluationCaseSchema).min(1).parse(value) as CorrectionEvaluationCase[];
  const ids = new Set<string>();
  for (const evaluationCase of cases) {
    if (ids.has(evaluationCase.id)) throw new Error(`Duplicate correction evaluation case id: ${evaluationCase.id}`);
    ids.add(evaluationCase.id);
  }
  return cases;
}

export interface CorrectionEvaluationOutput {
  caseId: string;
  feedback?: Pick<EssayFeedback, "cefr">;
  error?: string;
}

export interface CorrectionEvaluationSummary {
  totalCases: number;
  validResponses: number;
  invalidResponses: number;
  exactConservativeMatches: number;
  conservativeAccuracy: number | null;
  withinOneBand: number;
  withinOneBandRate: number | null;
  underClassifications: number;
  overClassifications: number;
  estimatedExactMatches: number;
  estimatedComparableCases: number;
  confusionMatrix: Record<CefrLevel, Record<CefrLevel, number>>;
  regressions: Array<{
    caseId: string;
    expected: CefrLevel;
    actual: CefrLevel;
    direction: "under" | "over";
  }>;
}

function emptyConfusionMatrix(): Record<CefrLevel, Record<CefrLevel, number>> {
  return Object.fromEntries(CEFR_LEVELS.map((expected) => [expected, Object.fromEntries(CEFR_LEVELS.map((actual) => [actual, 0]))])) as Record<
    CefrLevel,
    Record<CefrLevel, number>
  >;
}

export function cefrLevelDistance(left: CefrLevel, right: CefrLevel): number {
  return CEFR_LEVELS.indexOf(left) - CEFR_LEVELS.indexOf(right);
}

/**
 * Converts raw model outputs into model-comparison metrics. It is pure and
 * intentionally provider-agnostic, so the same assertions cover Gemini,
 * OpenRouter-routed models, and any future provider adapter.
 */
export function summarizeCorrectionEvaluation(
  cases: readonly CorrectionEvaluationCase[],
  outputs: readonly CorrectionEvaluationOutput[],
): CorrectionEvaluationSummary {
  const outputByCaseId = new Map(outputs.map((output) => [output.caseId, output]));
  const confusionMatrix = emptyConfusionMatrix();
  const regressions: CorrectionEvaluationSummary["regressions"] = [];
  let validResponses = 0;
  let exactConservativeMatches = 0;
  let withinOneBand = 0;
  let underClassifications = 0;
  let overClassifications = 0;
  let estimatedExactMatches = 0;
  let estimatedComparableCases = 0;

  for (const evaluationCase of cases) {
    const output = outputByCaseId.get(evaluationCase.id);
    const actual = output?.feedback?.cefr;
    if (!actual) continue;

    validResponses += 1;
    const expected = evaluationCase.expected.conservativeLevel;
    confusionMatrix[expected][actual.conservativeLevel] += 1;
    const distance = cefrLevelDistance(actual.conservativeLevel, expected);
    if (distance === 0) exactConservativeMatches += 1;
    if (Math.abs(distance) <= 1) withinOneBand += 1;
    if (distance < 0) {
      underClassifications += 1;
      regressions.push({ caseId: evaluationCase.id, expected, actual: actual.conservativeLevel, direction: "under" });
    }
    if (distance > 0) {
      overClassifications += 1;
      regressions.push({ caseId: evaluationCase.id, expected, actual: actual.conservativeLevel, direction: "over" });
    }
    if (evaluationCase.expected.estimatedLevel) {
      estimatedComparableCases += 1;
      if (actual.estimatedLevel === evaluationCase.expected.estimatedLevel) estimatedExactMatches += 1;
    }
  }

  return {
    totalCases: cases.length,
    validResponses,
    invalidResponses: cases.length - validResponses,
    exactConservativeMatches,
    conservativeAccuracy: validResponses ? exactConservativeMatches / validResponses : null,
    withinOneBand,
    withinOneBandRate: validResponses ? withinOneBand / validResponses : null,
    underClassifications,
    overClassifications,
    estimatedExactMatches,
    estimatedComparableCases,
    confusionMatrix,
    regressions,
  };
}
