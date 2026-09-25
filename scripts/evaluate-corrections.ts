/**
 * Runs the same correction prompt and provider contract used by the product
 * against a hand-labelled JSON evaluation set. It never writes the database
 * or uses learner quotas; --use-active-prompt-overrides may read only the
 * current prompt configuration so the baseline is reproducible.
 *
 * Example:
 *   npm run eval:corrections -- --dataset docs/correction-eval-dataset.example.json \
 *     --candidate gemini:gemini-3.5-flash-lite \
 *     --candidate openrouter:openai/gpt-5-mini \
 *     --prompt baseline --prompt calibration-review
 */
import "dotenv/config";

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { freshEssayFeedbackSchema } from "@/lib/essay-feedback";
import {
  parseCorrectionEvaluationCases,
  correctionPromptOverridesFingerprint,
  modalCorrectionEvaluationOutputs,
  parseCorrectionPromptOverrides,
  summarizeCorrectionEvaluation,
  type CorrectionEvaluationOutput,
} from "@/lib/correction-evaluation";
import { isCorrectionProviderId, type CorrectionProviderId } from "@/lib/correction-provider";
import { getCorrectionProvider } from "@/lib/correction-provider-registry";
import {
  CORRECTION_PROMPT_VARIANTS,
  type CorrectionPromptVariant,
  type CorrectionPromptOverrides,
  buildCorrectionSystemPrompt,
  buildCorrectionUserPrompt,
} from "@/lib/essay-correction-prompt";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";

interface Candidate {
  id: string;
  providerId: CorrectionProviderId;
  model: string;
}

interface ParsedArguments {
  datasetPath: string;
  candidates: Candidate[];
  promptVariants: CorrectionPromptVariant[];
  promptOverridesPath?: string;
  useActivePromptOverrides: boolean;
  repeat: number;
  outputPath?: string;
}

interface PromptSnapshot {
  overrides: CorrectionPromptOverrides;
  source: "built-in-defaults" | "file" | "active-app-config";
  fingerprint: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function usage(): never {
  throw new Error(
    "Usage: npm run eval:corrections -- --dataset <cases.json> --candidate <gemini|openrouter>:<model> [--candidate ...] [--prompt baseline|calibration-review] [--prompt-overrides overrides.json | --use-active-prompt-overrides] [--repeat 3] [--output report.json]",
  );
}

function parseCandidate(value: string): Candidate {
  const separator = value.indexOf(":");
  const provider = value.slice(0, separator);
  const model = value.slice(separator + 1).trim();
  if (separator < 1 || !isCorrectionProviderId(provider) || !model) usage();
  return { id: value, providerId: provider, model };
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  let datasetPath: string | undefined;
  let outputPath: string | undefined;
  let promptOverridesPath: string | undefined;
  let useActivePromptOverrides = false;
  let repeat = 1;
  const candidates: Candidate[] = [];
  const promptVariants: CorrectionPromptVariant[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--use-active-prompt-overrides") {
      useActivePromptOverrides = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) usage();
    if (flag === "--dataset") datasetPath = value;
    else if (flag === "--candidate") candidates.push(parseCandidate(value));
    else if (flag === "--prompt") {
      if (!(CORRECTION_PROMPT_VARIANTS as readonly string[]).includes(value)) usage();
      promptVariants.push(value as CorrectionPromptVariant);
    } else if (flag === "--output") outputPath = value;
    else if (flag === "--prompt-overrides") promptOverridesPath = value;
    else if (flag === "--repeat") {
      repeat = Number(value);
      if (!Number.isInteger(repeat) || repeat < 1 || repeat > 20) usage();
    }
    else usage();
    index += 1;
  }

  if (!datasetPath || candidates.length === 0 || (promptOverridesPath && useActivePromptOverrides)) usage();
  return {
    datasetPath,
    candidates,
    promptVariants: promptVariants.length ? [...new Set(promptVariants)] : ["baseline"],
    promptOverridesPath,
    useActivePromptOverrides,
    repeat,
    outputPath,
  };
}

function fingerprintPromptOverrides(overrides: CorrectionPromptOverrides): string {
  return createHash("sha256").update(correctionPromptOverridesFingerprint(overrides)).digest("hex");
}

async function resolvePromptSnapshot(args: ParsedArguments): Promise<PromptSnapshot> {
  if (args.useActivePromptOverrides) {
    // This reads only the active prompt configuration, not essays, feedback,
    // or any learner data. It makes "baseline" genuinely reproduce what the
    // correction route currently sends to providers.
    const { getPromptOverrides, toCorrectionPromptOverrides } = await import("@/lib/prompt-overrides");
    const overrides = toCorrectionPromptOverrides(await getPromptOverrides());
    return { overrides, source: "active-app-config", fingerprint: fingerprintPromptOverrides(overrides) };
  }
  if (args.promptOverridesPath) {
    const input = JSON.parse(await readFile(resolve(args.promptOverridesPath), "utf8")) as unknown;
    const overrides = parseCorrectionPromptOverrides(input);
    return { overrides, source: "file", fingerprint: fingerprintPromptOverrides(overrides) };
  }
  const overrides = {};
  return { overrides, source: "built-in-defaults", fingerprint: fingerprintPromptOverrides(overrides) };
}

async function runCandidate(
  candidate: Candidate,
  promptVariant: CorrectionPromptVariant,
  cases: ReturnType<typeof parseCorrectionEvaluationCases>,
  promptSnapshot: PromptSnapshot,
) {
  const provider = getCorrectionProvider(candidate.providerId);
  const overrides = { model: candidate.model };
  if (!provider.hasConfiguredCredentials(overrides)) {
    throw new Error(
      `No credential is configured for ${candidate.providerId}. Set ${candidate.providerId === "gemini" ? "GEMINI_API_KEY" : "OPENROUTER_API_KEY"}.`,
    );
  }

  const outputs: CorrectionEvaluationOutput[] = [];
  for (const evaluationCase of cases) {
    const task = TASK_INSTRUCTIONS[evaluationCase.taskType];
    const systemPrompt = buildCorrectionSystemPrompt(
      evaluationCase.feedbackLanguage ?? "English",
      evaluationCase.taskType,
      evaluationCase.topicPrompt,
      promptSnapshot.overrides,
      promptVariant,
    );
    const userPrompt = buildCorrectionUserPrompt({
      task,
      resolvedTopicPrompt: evaluationCase.topicPrompt,
      content: evaluationCase.essay,
      wordCount: countWords(evaluationCase.essay),
    });
    try {
      const rawFeedback = await provider.gradeEssay({ systemPrompt, userPrompt }, overrides);
      const parsed = freshEssayFeedbackSchema.safeParse(rawFeedback);
      outputs.push(
        parsed.success
          ? { caseId: evaluationCase.id, feedback: { cefr: parsed.data.cefr } }
          : { caseId: evaluationCase.id, error: "Provider returned feedback that does not match the production schema." },
      );
    } catch (error) {
      outputs.push({ caseId: evaluationCase.id, error: error instanceof Error ? error.message : "Provider call failed." });
    }
  }

  return {
    outputs,
    summary: summarizeCorrectionEvaluation(cases, outputs),
    cases: cases.map((evaluationCase) => {
      const output = outputs.find((item) => item.caseId === evaluationCase.id);
      return {
        id: evaluationCase.id,
        expected: evaluationCase.expected,
        actual: output?.feedback?.cefr,
        error: output?.error,
      };
    }),
  };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const dataset = JSON.parse(await readFile(resolve(args.datasetPath), "utf8")) as unknown;
  const cases = parseCorrectionEvaluationCases(dataset);
  const promptSnapshot = await resolvePromptSnapshot(args);
  const reports = [];
  for (const candidate of args.candidates) {
    for (const promptVariant of args.promptVariants) {
      console.error(`Evaluating ${candidate.id} with ${promptVariant} on ${cases.length} cases (${args.repeat} run(s))...`);
      const runs = [];
      for (let run = 1; run <= args.repeat; run += 1) {
        runs.push(await runCandidate(candidate, promptVariant, cases, promptSnapshot));
      }
      const modal = modalCorrectionEvaluationOutputs(
        cases,
        runs.map((run) => run.outputs),
      );
      reports.push({
        candidate: candidate.id,
        provider: candidate.providerId,
        model: candidate.model,
        promptVariant,
        promptOverrides: { source: promptSnapshot.source, sha256: promptSnapshot.fingerprint },
        runs: runs.map((run, index) => ({ run: index + 1, summary: run.summary, cases: run.cases })),
        modal: {
          summary: summarizeCorrectionEvaluation(cases, modal),
          cases: cases.map((evaluationCase) => {
            const output = modal.find((item) => item.caseId === evaluationCase.id);
            return { id: evaluationCase.id, expected: evaluationCase.expected, actual: output?.feedback?.cefr, error: output?.error };
          }),
        },
      });
    }
  }
  const report = { generatedAt: new Date().toISOString(), dataset: resolve(args.datasetPath), reports };
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.outputPath) await writeFile(resolve(args.outputPath), output, "utf8");
  else process.stdout.write(output);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
