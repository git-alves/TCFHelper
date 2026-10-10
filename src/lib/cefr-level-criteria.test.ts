import { describe, expect, it } from "vitest";
import {
  CEFR_LEVEL_CRITERIA,
  CRITERIA_SHEET_LEVELS,
  renderGeneratorLevelCriteria,
  renderGraderLevelCriteria,
} from "./cefr-level-criteria";
import { DEFAULT_CORRECTION_BASE_PROMPT, buildCorrectionSystemPrompt } from "./essay-correction-prompt";
import { buildExamplePrompt } from "./gemini";
import { TASK_INSTRUCTIONS } from "./tcf-tasks";

const DEFINITION_FIELDS = [
  "taskAndStructure",
  "rangeAndPrecision",
  "vocabularyControl",
  "grammarAndSpelling",
  "cohesion",
  "registerAndStyle",
] as const;

function examplePromptFor(level: (typeof CRITERIA_SHEET_LEVELS)[number], taskType: "TASK_1" | "TASK_2" | "TASK_3") {
  return buildExamplePrompt({
    task: TASK_INSTRUCTIONS[taskType],
    taskType,
    level,
    topicPrompt: "Écrivez à votre voisin.",
  });
}

describe("shared B2/C1/C2 criteria sheet", () => {
  it("defines every aspect for every level, so neither prompt gets a partial definition", () => {
    for (const level of CRITERIA_SHEET_LEVELS) {
      expect(CEFR_LEVEL_CRITERIA[level].summary.trim()).not.toBe("");
      for (const field of DEFINITION_FIELDS) {
        expect(CEFR_LEVEL_CRITERIA[level][field].trim(), `${level}.${field}`).not.toBe("");
      }
    }
  });

  it("gives the grader's default prompt every level's definition verbatim", () => {
    const sheet = renderGraderLevelCriteria();

    expect(DEFAULT_CORRECTION_BASE_PROMPT).toContain(sheet);
    for (const level of CRITERIA_SHEET_LEVELS) {
      for (const field of DEFINITION_FIELDS) {
        expect(sheet).toContain(CEFR_LEVEL_CRITERIA[level][field]);
      }
    }
  });

  it.each(CRITERIA_SHEET_LEVELS.flatMap((level) => (["TASK_1", "TASK_2", "TASK_3"] as const).map((task) => [level, task] as const)))(
    "gives the generator the same %s definition the grader uses (%s)",
    (level, taskType) => {
      const generatorPrompt = examplePromptFor(level, taskType);
      const graderPrompt = buildCorrectionSystemPrompt("English", taskType, "Écrivez à votre voisin.");

      expect(generatorPrompt).toContain(renderGeneratorLevelCriteria(level));
      // Every definition line the generator is asked to follow is, character
      // for character, a line the grader judges against.
      for (const field of DEFINITION_FIELDS) {
        const definition = CEFR_LEVEL_CRITERIA[level][field];
        expect(generatorPrompt).toContain(definition);
        expect(graderPrompt).toContain(definition);
      }
    },
  );

  it("only describes the requested level to the generator", () => {
    const b2Prompt = examplePromptFor("B2", "TASK_2");

    expect(b2Prompt).toContain(CEFR_LEVEL_CRITERIA.B2.rangeAndPrecision);
    expect(b2Prompt).not.toContain(CEFR_LEVEL_CRITERIA.C1.rangeAndPrecision);
    expect(b2Prompt).not.toContain(CEFR_LEVEL_CRITERIA.C2.rangeAndPrecision);
  });

  it("keeps C2 framed as quality of control, and the C1/C2 contrast observable", () => {
    const c2 = CEFR_LEVEL_CRITERIA.C2;

    expect(c2.caution).toContain("quality of control, not difficulty of vocabulary");
    expect(c2.rangeAndPrecision).toContain("modalising devices");
    expect(c2.rangeAndPrecision).toContain("precise control of nuance and intent");
    expect(c2.registerAndStyle).toContain("remove ambiguity");
    expect(c2.vocabularyControl).toContain("connotation");
    expect(c2.taskAndStructure).toContain("helps the reader notice the important points");
  });

  it("asks both sides to judge a feature only where the task offers an opportunity", () => {
    expect(renderGraderLevelCriteria()).toContain("only where the task gives the writer a reasonable opportunity");
    expect(renderGeneratorLevelCriteria("C2")).toContain("where the topic gives a natural opportunity");
  });
});
