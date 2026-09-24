import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CORRECTION_BASE_PROMPT,
  DEFAULT_TASK_3_DOCUMENTLESS_CORRECTION_PROMPT,
  DEFAULT_TASK_3_DOCUMENTS_CORRECTION_PROMPT,
  DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS,
  type CorrectionPromptOverrides,
} from "@/lib/essay-correction-prompt";
import {
  DEFAULT_TASK_ONE_EXAMPLE_STRUCTURE,
  DEFAULT_TASK_ONE_LEVEL_DESCRIPTIONS,
  DEFAULT_TASK_THREE_LEVEL_DESCRIPTIONS,
  DEFAULT_TASK_THREE_STRUCTURE,
  DEFAULT_TASK_TWO_EXAMPLE_STRUCTURE,
  DEFAULT_TASK_TWO_LEVEL_DESCRIPTIONS,
  type ExamplePromptOverrides,
} from "@/lib/gemini";

// The fixed, application-defined set of editable correction and
// example-generation prompt blocks (see the model comment on PromptOverride
// in schema.prisma for why this is a key/value table rather than named
// columns). Adding a new editable block only ever needs a new entry here,
// never a migration.
export const PROMPT_OVERRIDE_KEYS = [
  "correctionBase",
  "correctionTask1",
  "correctionTask2",
  "correctionTask3Documents",
  "correctionTask3Documentless",
  "exampleTask1Structure",
  "exampleTask2Structure",
  "exampleTask3Structure",
  "exampleTask1LevelB2",
  "exampleTask1LevelC1",
  "exampleTask1LevelC2",
  "exampleTask2LevelB2",
  "exampleTask2LevelC1",
  "exampleTask2LevelC2",
  "exampleTask3LevelB2",
  "exampleTask3LevelC1",
  "exampleTask3LevelC2",
] as const;

export type PromptOverrideKey = (typeof PROMPT_OVERRIDE_KEYS)[number];

export const PROMPT_OVERRIDE_DEFAULTS: Record<PromptOverrideKey, string> = {
  correctionBase: DEFAULT_CORRECTION_BASE_PROMPT,
  correctionTask1: DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS.TASK_1,
  correctionTask2: DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS.TASK_2,
  correctionTask3Documents: DEFAULT_TASK_3_DOCUMENTS_CORRECTION_PROMPT,
  correctionTask3Documentless: DEFAULT_TASK_3_DOCUMENTLESS_CORRECTION_PROMPT,
  exampleTask1Structure: DEFAULT_TASK_ONE_EXAMPLE_STRUCTURE,
  exampleTask2Structure: DEFAULT_TASK_TWO_EXAMPLE_STRUCTURE,
  exampleTask3Structure: DEFAULT_TASK_THREE_STRUCTURE,
  exampleTask1LevelB2: DEFAULT_TASK_ONE_LEVEL_DESCRIPTIONS.B2,
  exampleTask1LevelC1: DEFAULT_TASK_ONE_LEVEL_DESCRIPTIONS.C1,
  exampleTask1LevelC2: DEFAULT_TASK_ONE_LEVEL_DESCRIPTIONS.C2,
  exampleTask2LevelB2: DEFAULT_TASK_TWO_LEVEL_DESCRIPTIONS.B2,
  exampleTask2LevelC1: DEFAULT_TASK_TWO_LEVEL_DESCRIPTIONS.C1,
  exampleTask2LevelC2: DEFAULT_TASK_TWO_LEVEL_DESCRIPTIONS.C2,
  exampleTask3LevelB2: DEFAULT_TASK_THREE_LEVEL_DESCRIPTIONS.B2,
  exampleTask3LevelC1: DEFAULT_TASK_THREE_LEVEL_DESCRIPTIONS.C1,
  exampleTask3LevelC2: DEFAULT_TASK_THREE_LEVEL_DESCRIPTIONS.C2,
};

// Grouped visually by the "correction"/"example" key prefix into two
// sections on the admin page (see admin-prompts-form.tsx), so these labels
// don't repeat that grouping themselves.
export const PROMPT_OVERRIDE_LABELS: Record<PromptOverrideKey, string> = {
  correctionBase: "Shared base prompt",
  correctionTask1: "Tache 1",
  correctionTask2: "Tache 2",
  correctionTask3Documents: "Tache 3 (with source documents)",
  correctionTask3Documentless: "Tache 3 (no source documents)",
  exampleTask1Structure: "Tache 1 structure",
  exampleTask2Structure: "Tache 2 structure",
  exampleTask3Structure: "Tache 3 structure (with source documents)",
  exampleTask1LevelB2: "Tache 1, B2 level description",
  exampleTask1LevelC1: "Tache 1, C1 level description",
  exampleTask1LevelC2: "Tache 1, C2 level description",
  exampleTask2LevelB2: "Tache 2, B2 level description",
  exampleTask2LevelC1: "Tache 2, C1 level description",
  exampleTask2LevelC2: "Tache 2, C2 level description",
  exampleTask3LevelB2: "Tache 3, B2 level description",
  exampleTask3LevelC1: "Tache 3, C1 level description",
  exampleTask3LevelC2: "Tache 3, C2 level description",
};

export type PromptOverrideValues = Record<PromptOverrideKey, string | null>;

function isPromptOverrideKey(value: string): value is PromptOverrideKey {
  return (PROMPT_OVERRIDE_KEYS as readonly string[]).includes(value);
}

/** Never throws for a key with no override row: that's the normal "use the built-in default" state. */
export async function getPromptOverrides(): Promise<PromptOverrideValues> {
  const rows = await prisma.promptOverride.findMany({
    where: { key: { in: [...PROMPT_OVERRIDE_KEYS] } },
  });
  const values = Object.fromEntries(PROMPT_OVERRIDE_KEYS.map((key) => [key, null])) as PromptOverrideValues;
  for (const row of rows) {
    if (isPromptOverrideKey(row.key)) values[row.key] = row.value;
  }
  return values;
}

export interface PromptOverrideDisplaySection {
  label: string;
  value: string | null;
  defaultValue: string;
}

export type PromptOverrideDisplay = Record<PromptOverrideKey, PromptOverrideDisplaySection>;

/** For the /admin/prompts form: each key's current override (or null) alongside its built-in default and label. */
export async function getPromptOverridesDisplay(): Promise<PromptOverrideDisplay> {
  const values = await getPromptOverrides();
  return Object.fromEntries(
    PROMPT_OVERRIDE_KEYS.map((key) => [
      key,
      { label: PROMPT_OVERRIDE_LABELS[key], value: values[key], defaultValue: PROMPT_OVERRIDE_DEFAULTS[key] },
    ]),
  ) as PromptOverrideDisplay;
}

/** Shaped directly for buildCorrectionSystemPrompt's overrides parameter. */
export function toCorrectionPromptOverrides(values: PromptOverrideValues): CorrectionPromptOverrides {
  return {
    base: values.correctionBase,
    task1: values.correctionTask1,
    task2: values.correctionTask2,
    task3Documents: values.correctionTask3Documents,
    task3Documentless: values.correctionTask3Documentless,
  };
}

/** Shaped directly for buildExamplePrompt's (via GenerateModelAnswerParams) promptOverrides field. */
export function toExamplePromptOverrides(values: PromptOverrideValues): ExamplePromptOverrides {
  return {
    task1Structure: values.exampleTask1Structure,
    task2Structure: values.exampleTask2Structure,
    task3Structure: values.exampleTask3Structure,
    task1Levels: { B2: values.exampleTask1LevelB2, C1: values.exampleTask1LevelC1, C2: values.exampleTask1LevelC2 },
    task2Levels: { B2: values.exampleTask2LevelB2, C1: values.exampleTask2LevelC1, C2: values.exampleTask2LevelC2 },
    task3Levels: { B2: values.exampleTask3LevelB2, C1: values.exampleTask3LevelC1, C2: values.exampleTask3LevelC2 },
  };
}

export type PromptOverrideUpdateInput = Partial<Record<PromptOverrideKey, string | null>>;

/**
 * A key omitted from `patch` is left untouched. An empty string (or null)
 * clears that block back to its built-in default by deleting its row,
 * rather than storing an empty override that would render as blank text.
 */
export async function updatePromptOverrides(patch: PromptOverrideUpdateInput): Promise<PromptOverrideValues> {
  const entries = Object.entries(patch) as [PromptOverrideKey, string | null | undefined][];

  await prisma.$transaction(
    entries
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => {
        const trimmed = value?.trim();
        // deleteMany rather than delete: a key with no existing override row
        // (already at its default) must clear silently, not throw P2025.
        return trimmed
          ? prisma.promptOverride.upsert({
              where: { key },
              create: { key, value: trimmed },
              update: { value: trimmed },
            })
          : prisma.promptOverride.deleteMany({ where: { key } });
      }),
  );

  return getPromptOverrides();
}
