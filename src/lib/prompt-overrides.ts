import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_CORRECTION_BASE_PROMPT,
  DEFAULT_TASK_3_DOCUMENTLESS_CORRECTION_PROMPT,
  DEFAULT_TASK_3_DOCUMENTS_CORRECTION_PROMPT,
  DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS,
  type CorrectionPromptOverrides,
} from "@/lib/essay-correction-prompt";

// The fixed, application-defined set of editable correction prompt blocks
// (see the model comment on PromptOverride in schema.prisma for why this is
// a key/value table rather than named columns). Adding a new editable block
// only ever needs a new entry here, never a migration.
export const PROMPT_OVERRIDE_KEYS = [
  "correctionBase",
  "correctionTask1",
  "correctionTask2",
  "correctionTask3Documents",
  "correctionTask3Documentless",
] as const;

export type PromptOverrideKey = (typeof PROMPT_OVERRIDE_KEYS)[number];

export const PROMPT_OVERRIDE_DEFAULTS: Record<PromptOverrideKey, string> = {
  correctionBase: DEFAULT_CORRECTION_BASE_PROMPT,
  correctionTask1: DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS.TASK_1,
  correctionTask2: DEFAULT_TASK_SPECIFIC_CORRECTION_PROMPTS.TASK_2,
  correctionTask3Documents: DEFAULT_TASK_3_DOCUMENTS_CORRECTION_PROMPT,
  correctionTask3Documentless: DEFAULT_TASK_3_DOCUMENTLESS_CORRECTION_PROMPT,
};

export const PROMPT_OVERRIDE_LABELS: Record<PromptOverrideKey, string> = {
  correctionBase: "Shared base prompt",
  correctionTask1: "Tache 1",
  correctionTask2: "Tache 2",
  correctionTask3Documents: "Tache 3 (with source documents)",
  correctionTask3Documentless: "Tache 3 (no source documents)",
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
