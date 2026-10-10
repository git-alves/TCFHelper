// The single definition of what B2, C1 and C2 written French looks like.
//
// Both the grader (essay-correction-prompt.ts) and the example generator
// (gemini.ts buildExamplePrompt) render their level text from this one sheet,
// so the generator can never be asked to write a kind of text that the grader
// then judges against different criteria. Change a level's definition here
// and both prompts change together; cefr-level-criteria.test.ts fails if
// either one stops using it.
//
// Wording is grounded in the CEFR (Common European Framework, 2001) scales for
// written production, range, vocabulary, grammatical accuracy, spelling,
// flexibility, precision, coherence and cohesion -- paraphrased, not quoted,
// and kept task-agnostic. What a task requires (its purpose, format and
// structure) lives with each task's own rubric and example structure and makes
// no claim about any CEFR level; cefr-level-criteria.test.ts enforces that.
//
// This sheet defines the levels only. HOW MUCH evidence the grader needs
// before awarding one (sustained control, the "lower level when mixed" rule,
// short-text scaling) stays in the grader's own decision rules. In particular
// the C2 accuracy line below keeps the grader's existing strictness ("isolated
// slips that do not undermine naturalness") rather than the CEFR's literal
// "no spelling mistakes" at C2 -- adopting that is a product decision, not
// something to change silently here.

export const CRITERIA_SHEET_LEVELS = ["B2", "C1", "C2"] as const;
export type CriteriaSheetLevel = (typeof CRITERIA_SHEET_LEVELS)[number];

export interface LevelCriteria {
  /** One-line picture of the level. */
  summary: string;
  taskAndStructure: string;
  argumentation: string;
  rangeAndPrecision: string;
  vocabularyControl: string;
  grammarAndSpelling: string;
  cohesion: string;
  registerAndStyle: string;
  /** A misreading of the level worth ruling out explicitly. */
  caution?: string;
}

// Display order and labels of the aspects, shared by both renderers.
const ASPECTS: ReadonlyArray<readonly [Exclude<keyof LevelCriteria, "summary" | "caution">, string]> = [
  ["taskAndStructure", "Task and structure"],
  ["argumentation", "Argumentation (where the task asks for it)"],
  ["rangeAndPrecision", "Range and precision"],
  ["vocabularyControl", "Vocabulary control"],
  ["grammarAndSpelling", "Grammar and spelling"],
  ["cohesion", "Cohesion"],
  ["registerAndStyle", "Register and style"],
];

export const CEFR_LEVEL_CRITERIA: Record<CriteriaSheetLevel, LevelCriteria> = {
  B2: {
    summary:
      "clear, detailed, coherent writing that develops and justifies its points; errors occur but do not obscure meaning.",
    taskAndStructure:
      "Communicates clearly and in reasonable detail; develops and justifies ideas with relevant detail and examples; can synthesise and evaluate information or arguments; organises a coherent text suited to the task.",
    argumentation:
      "A clear position with understandable reasons; arguments sufficiently developed and logically connected; a generally clear comparison of viewpoints; relevant examples or explanations. Arguments may still be relatively straightforward.",
    rangeAndPrecision:
      "A good range of language for the topic -- enough to describe, give a viewpoint and argue without visibly searching for words; can vary wording to avoid frequent repetition, though gaps may still force circumlocution.",
    vocabularyControl:
      "Vocabulary is generally accurate; confusions or wrong word choices occur but do not impede communication.",
    grammarAndSpelling:
      "Good grammatical control and a range of structures; occasional slips, non-systematic errors and minor syntax faults, which are rare; no errors that cause misunderstanding. Spelling and punctuation are relatively accurate and may show first-language influence.",
    cohesion:
      "Uses a good variety of linking words to mark the relations between ideas clearly; a longer text may still show some jumps.",
    registerAndStyle: "Adapts formality and manner of expression to the situation and the reader.",
  },
  C1: {
    summary:
      "well-structured, fluent writing on complex subjects that expresses ideas precisely and without visible restriction; errors are rare and hard to spot.",
    taskAndStructure:
      "Clear, detailed, well-structured text on complex subjects; highlights the salient points; supports a viewpoint at some length with secondary arguments, justifications and relevant examples, and reaches an appropriate conclusion.",
    argumentation:
      "Well-developed, logically connected arguments; clear synthesis of the viewpoints and precise comparison; effective justification; relevant qualification and nuance, acknowledging limits or opposing considerations.",
    rangeAndPrecision:
      "Selects the appropriate formulation from a broad repertoire to say what is meant without restriction, with little visible searching or avoidance; qualifies opinions and statements precisely (certainty and doubt, confidence and mistrust); expresses ideas precisely rather than merely correctly.",
    vocabularyControl:
      "Good command of idiomatic and colloquial expressions; occasional minor slips but no significant vocabulary errors.",
    grammarAndSpelling:
      "Consistently strong grammatical control with varied, controlled syntax; errors are rare and difficult to spot. Spelling is accurate apart from a few slips; layout, paragraphing and punctuation are logical and helpful.",
    cohesion: "A clear, fluent, well-structured text with controlled, sophisticated use of structuring and linking devices.",
    registerAndStyle:
      "Appropriate register and a confident, natural style suited to the reader; nuanced argumentation where relevant.",
  },
  C2: {
    summary:
      "elaborate, limpid and fluent writing in an effective style, with a structure that helps the reader see the key points and precise control of fine shades of meaning.",
    taskAndStructure:
      "Elaborate, clear and fluent text in an appropriate, effective style, with a logical structure that helps the reader notice the important points; for argumentative tasks, a complex issue is posed and weighed critically.",
    argumentation:
      "Exceptionally controlled argumentation: precise synthesis, subtle distinctions and nuanced evaluation; a highly controlled argument structure; counterarguments handled naturally and qualification applied precisely.",
    rangeAndPrecision:
      "Exhaustive, reliable command of a very wide range of language, with precise control of nuance and intent: fine shades of meaning are expressed through a wide range of modalising devices (for example degree adverbs and restrictive clauses), meaning can be emphasised, distinguished or disambiguated, with complex structures used naturally, without sounding forced. Shows no sign of having to restrict what is meant.",
    vocabularyControl:
      "Idiomatic and common expressions are well controlled, with awareness of connotation; vocabulary is used consistently correctly and appropriately.",
    grammarAndSpelling:
      "High grammatical accuracy is maintained consistently, including in complex language; any slips are isolated and do not undermine naturalness.",
    cohesion:
      "Highly flexible cohesion: complete and appropriate use of organisational structures and a great variety of connectors, expressing even abstract relationships and subtle distinctions between ideas precisely.",
    registerAndStyle:
      "Reformulates ideas in varied forms to emphasise, mark a distinction for the situation or the reader, or remove ambiguity; varies register and construction as the situation calls for, with subtle control of tone.",
    caution:
      'C2 is a matter of quality of control, not difficulty of vocabulary -- never define it as merely "C1, but more sophisticated," and never infer it from vocabulary complexity alone.',
  },
};

function renderLevelBlock(level: CriteriaSheetLevel): string {
  const criteria = CEFR_LEVEL_CRITERIA[level];
  const lines = [
    `${level} -- ${criteria.summary}`,
    ...ASPECTS.map(([key, label]) => `- ${label}: ${criteria[key]}`),
  ];
  if (criteria.caution) lines.push(`- Caution: ${criteria.caution}`);
  return lines.join("\n");
}

/**
 * The grader's view: all three levels, as the definition of what sustained
 * control at each level looks like. The decision rules around it (how much
 * evidence, when to choose the lower level) are the grader's own.
 */
export function renderGraderLevelCriteria(): string {
  return [
    "LEVEL CRITERIA (the same definitions the model-answer generator is given for each level)",
    "",
    "Each level below describes what sustained control at that level looks like in a written response. Judge a feature only where the task gives the writer a reasonable opportunity to show it: a short response cannot show every feature, and a missing opportunity is not, by itself, evidence for or against a level.",
    "",
    ...CRITERIA_SHEET_LEVELS.map(renderLevelBlock).flatMap((block) => [block, ""]),
  ]
    .join("\n")
    .trimEnd();
}

/**
 * The generator's view: only the requested level, phrased as what the text
 * must show, from the very same entries the grader renders above.
 */
export function renderGeneratorLevelCriteria(level: CriteriaSheetLevel): string {
  return [
    `Level ${level} criteria (the same definition the grader will use to assess this text):`,
    renderLevelBlock(level),
    "Show these features where the topic gives a natural opportunity to; do not force idioms, and do not substitute ornate vocabulary for genuine control.",
  ].join("\n");
}
