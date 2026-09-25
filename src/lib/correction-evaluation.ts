import { CEFR_LEVELS, type EssayFeedback } from "@/lib/essay-feedback";
import type { CorrectionPromptOverrides } from "@/lib/essay-correction-prompt";
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

const correctionPromptOverridesSchema = z
  .object({
    base: z.string().nullable().optional(),
    task1: z.string().nullable().optional(),
    task2: z.string().nullable().optional(),
    task3Documents: z.string().nullable().optional(),
    task3Documentless: z.string().nullable().optional(),
  })
  .strict();

/**
 * Parses a correction-prompt snapshot supplied to the evaluator. Keeping the
 * snapshot explicit makes a report reproducible even after an admin edits a
 * prompt block; unknown keys fail rather than being quietly ignored.
 */
export function parseCorrectionPromptOverrides(value: unknown): CorrectionPromptOverrides {
  return correctionPromptOverridesSchema.parse(value);
}

/** A deterministic record of the exact correction-prompt override inputs. */
export function correctionPromptOverridesFingerprint(overrides: CorrectionPromptOverrides): string {
  return JSON.stringify({
    base: overrides.base?.trim() || null,
    task1: overrides.task1?.trim() || null,
    task2: overrides.task2?.trim() || null,
    task3Documents: overrides.task3Documents?.trim() || null,
    task3Documentless: overrides.task3Documentless?.trim() || null,
  });
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

/**
 * Returns one CEFR result per case from repeated provider calls. A result
 * must be backed by a strict majority of ALL repeats -- not just of the
 * ones that returned valid feedback -- otherwise it is reported invalid.
 * Counting only among valid votes would let e.g. 1 successful call plus 2
 * failed ones out of 3 repeats report a misleadingly confident 100% "modal"
 * result despite the provider failing most of the time; requiring a true
 * majority of all repeats also subsumes the tie case (two candidates can
 * never both hold a strict majority), so unstable CEFR classification is
 * caught the same way a mostly-failing provider is.
 */
export function modalCorrectionEvaluationOutputs(
  cases: readonly CorrectionEvaluationCase[],
  runs: ReadonlyArray<readonly CorrectionEvaluationOutput[]>,
): CorrectionEvaluationOutput[] {
  const totalRuns = runs.length;
  return cases.map((evaluationCase) => {
    const votes = new Map<string, { count: number; output: CorrectionEvaluationOutput }>();
    for (const run of runs) {
      const output = run.find((item) => item.caseId === evaluationCase.id);
      if (!output?.feedback) continue;
      const key = `${output.feedback.cefr.conservativeLevel}|${output.feedback.cefr.estimatedLevel}`;
      const vote = votes.get(key);
      if (vote) vote.count += 1;
      else votes.set(key, { count: 1, output });
    }
    const ranked = [...votes.values()].sort((left, right) => right.count - left.count);
    if (ranked.length === 0) {
      return { caseId: evaluationCase.id, error: "All repeated provider calls failed or returned invalid feedback." };
    }
    if (ranked[0].count * 2 <= totalRuns) {
      return {
        caseId: evaluationCase.id,
        error: "No CEFR result was returned by a strict majority of repeated calls.",
      };
    }
    return ranked[0].output;
  });
}

export interface CorrectionEvaluationSummary {
  totalCases: number;
  validResponses: number;
  invalidResponses: number;
  exactConservativeMatches: number;
  /** Exact secure-level accuracy, with every attempted case in the denominator. */
  conservativeAccuracy: number | null;
  /** Diagnostic accuracy only among syntactically valid provider responses. */
  validResponseConservativeAccuracy: number | null;
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
    // A malformed/failed response is not an ungraded case: a candidate that
    // cannot return usable feedback is unsuitable even if every surviving
    // response is perfectly calibrated. Keep valid-response accuracy too,
    // but never use it as the release metric.
    conservativeAccuracy: cases.length ? exactConservativeMatches / cases.length : null,
    validResponseConservativeAccuracy: validResponses ? exactConservativeMatches / validResponses : null,
    withinOneBand,
    withinOneBandRate: cases.length ? withinOneBand / cases.length : null,
    underClassifications,
    overClassifications,
    estimatedExactMatches,
    estimatedComparableCases,
    confusionMatrix,
    regressions,
  };
}
