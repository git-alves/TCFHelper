import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_GEMINI_CORRECTION_MODEL, DEFAULT_GEMINI_MODEL } from "@/lib/gemini";

const CONFIG_ID = "singleton";

export interface AppConfigValue {
  correctionApiKey: string | null;
  correctionModel: string | null;
  exampleApiKey: string | null;
  exampleModel: string | null;
}

const EMPTY_CONFIG: AppConfigValue = {
  correctionApiKey: null,
  correctionModel: null,
  exampleApiKey: null,
  exampleModel: null,
};

/** Never throws for a missing row: no admin override yet is a normal state. */
export async function getAppConfig(): Promise<AppConfigValue> {
  const row = await prisma.appConfig.findUnique({ where: { id: CONFIG_ID } });
  if (!row) return EMPTY_CONFIG;
  return {
    correctionApiKey: row.correctionApiKey,
    correctionModel: row.correctionModel,
    exampleApiKey: row.exampleApiKey,
    exampleModel: row.exampleModel,
  };
}

export interface AppConfigUpdateInput {
  correctionApiKey?: string | null;
  correctionModel?: string | null;
  exampleApiKey?: string | null;
  exampleModel?: string | null;
}

/** An empty string clears a field back to its env-var default (see gemini.ts). */
export async function updateAppConfig(patch: AppConfigUpdateInput): Promise<AppConfigValue> {
  const normalized: AppConfigUpdateInput = {};
  for (const [key, value] of Object.entries(patch) as [keyof AppConfigUpdateInput, string | null | undefined][]) {
    if (value === undefined) continue;
    normalized[key] = value === null || value.trim() === "" ? null : value.trim();
  }

  const row = await prisma.appConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, ...normalized },
    update: normalized,
  });

  return {
    correctionApiKey: row.correctionApiKey,
    correctionModel: row.correctionModel,
    exampleApiKey: row.exampleApiKey,
    exampleModel: row.exampleModel,
  };
}

/** Shows only enough of a secret to recognize it, never enough to reuse it. */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

export interface AppConfigDisplaySection {
  apiKeySet: boolean;
  apiKeyMasked: string | null;
  apiKeyFromEnv: boolean;
  model: string | null;
  modelDefault: string;
}

export interface AppConfigDisplay {
  correction: AppConfigDisplaySection;
  example: AppConfigDisplaySection;
}

/**
 * Shared by the admin settings API route (for the client form) and the
 * settings page itself (for the initial server render), so the two never
 * drift on what "currently active" means for a given field.
 */
export function toAppConfigDisplay(config: AppConfigValue): AppConfigDisplay {
  return {
    correction: {
      apiKeySet: Boolean(config.correctionApiKey),
      apiKeyMasked: maskSecret(config.correctionApiKey),
      apiKeyFromEnv: !config.correctionApiKey && Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: config.correctionModel,
      modelDefault: process.env.GEMINI_CORRECTION_MODEL?.trim() || DEFAULT_GEMINI_CORRECTION_MODEL,
    },
    example: {
      apiKeySet: Boolean(config.exampleApiKey),
      apiKeyMasked: maskSecret(config.exampleApiKey),
      apiKeyFromEnv: !config.exampleApiKey && Boolean(process.env.GEMINI_API_KEY?.trim()),
      model: config.exampleModel,
      modelDefault: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    },
  };
}

export async function getAppConfigDisplay(): Promise<AppConfigDisplay> {
  return toAppConfigDisplay(await getAppConfig());
}
