import { describe, expect, it } from "vitest";
import {
  CEFR_LEVEL_CRITERIA,
  CRITERIA_SHEET_LEVELS,
  renderGeneratorLevelCriteria,
  renderGraderLevelCriteria,
} from "./cefr-level-criteria";
import {
  DEFAULT_CORRECTION_BASE_PROMPT,
  DEFAULT_TASK_3_DOCUMENTLESS_CORRECTION_PROMPT,
  DEFAULT_TASK_3_DOCUMENTS_CORRECTION_PROMPT,
  DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS,
  buildCorrectionSystemPrompt,
} from "./essay-correction-prompt";
import {
  DEFAULT_TASK_ONE_EXAMPLE_STRUCTURE,
  DEFAULT_TASK_THREE_STRUCTURE,
  DEFAULT_TASK_TWO_EXAMPLE_STRUCTURE,
  buildExamplePrompt,
} from "./gemini";
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

  it.each(CRITERIA_SHEET_LEVELS)("only describes %s to the generator, never either other level", (level) => {
    const prompt = examplePromptFor(level, "TASK_2");

    for (const other of CRITERIA_SHEET_LEVELS.filter((candidate) => candidate !== level)) {
      expect(prompt).not.toContain(CEFR_LEVEL_CRITERIA[other].summary);
      for (const field of DEFINITION_FIELDS) {
        expect(prompt, `${other}.${field}`).not.toContain(CEFR_LEVEL_CRITERIA[other][field]);
      }
      const caution = CEFR_LEVEL_CRITERIA[other].caution;
      if (caution) expect(prompt).not.toContain(caution);
    }
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

  describe("task requirements make no level claims (the sheet is the only level definition)", () => {
    // "For C1: look for ..." / "For C2, expect ..." / "For B2: require ..." define a level;
    // "For B2: identify what prevents C1" is a blocker instruction and is allowed.
    const DEFINITION_LINE = /\bFor (B2|C1|C2)[:,]? (look|expect|require)/;
    const LEVEL_LANGUAGE = /\b(A1|A2|B1|B2|C1|C2)\b|CEFR|near-complete|native/i;

    it.each([
      ["Tache 1 example structure", DEFAULT_TASK_ONE_EXAMPLE_STRUCTURE],
      ["Tache 2 example structure", DEFAULT_TASK_TWO_EXAMPLE_STRUCTURE],
      ["Tache 3 example structure", DEFAULT_TASK_THREE_STRUCTURE],
      ["Tache 1 instructions", TASK_INSTRUCTIONS.TASK_1.description],
      ["Tache 2 instructions", TASK_INSTRUCTIONS.TASK_2.description],
      ["Tache 3 instructions", TASK_INSTRUCTIONS.TASK_3.description],
    ])("%s says nothing about any CEFR level", (_name, text) => {
      expect(text).not.toMatch(LEVEL_LANGUAGE);
    });

    it.each([
      ["Tache 1", DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS.TASK_1],
      ["Tache 2", DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS.TASK_2],
      ["Tache 3 with documents", DEFAULT_TASK_3_DOCUMENTS_CORRECTION_PROMPT],
      ["Tache 3 without documents", DEFAULT_TASK_3_DOCUMENTLESS_CORRECTION_PROMPT],
    ])("the %s grader block defines no level of its own", (_name, block) => {
      // Naming a level in a blocker or decision rule is fine ("when the student
      // is B2, name what prevents C1"); defining what a level looks like is the
      // sheet's job alone.
      expect(block).not.toMatch(DEFINITION_LINE);
      expect(block).not.toMatch(/near-complete/i);
    });

    it.each(CRITERIA_SHEET_LEVELS.flatMap((level) => (["TASK_1", "TASK_2", "TASK_3"] as const).map((task) => [level, task] as const)))(
      "gives the %s generator prompt (%s) exactly one level definition",
      (level, taskType) => {
        const prompt = examplePromptFor(level, taskType);
        const sheetBlock = renderGeneratorLevelCriteria(level);

        expect(prompt.split(sheetBlock)).toHaveLength(2);
        // Take the sheet out: the only level mention left is the one-line
        // reference to the requested level, never a second description.
        const rest = prompt.replace(sheetBlock, "");
        expect(rest.match(/\b(A1|A2|B1|B2|C1|C2)\b/g)).toEqual([level]);
        expect(rest).not.toMatch(/near-complete/i);
      },
    );

    it.each(["TASK_1", "TASK_2", "TASK_3"] as const)(
      "keeps the whole default grader prompt (%s) free of a competing level definition",
      (taskType) => {
        const prompt = buildCorrectionSystemPrompt("English", taskType, "Écrivez à votre voisin.");

        expect(prompt).not.toMatch(/near-complete/i);
        expect(prompt).not.toMatch(DEFINITION_LINE);
        expect(prompt.split("LEVEL CRITERIA (the same definitions")).toHaveLength(2);
      },
    );
  });
});
