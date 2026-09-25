import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_GEMINI_CORRECTION_MODEL, DEFAULT_GEMINI_MODEL } from "@/lib/gemini";
import { getGeminiRequestsToday } from "@/lib/admin-overview";
import {
  DEFAULT_CORRECTION_PROVIDER,
  isCorrectionProviderId,
  type CorrectionProviderId,
} from "@/lib/correction-provider";
import {
  DEFAULT_EXAMPLE_PROVIDER,
  isExampleProviderId,
  type ExampleProviderId,
} from "@/lib/example-provider";

const CONFIG_ID = "singleton";

// A conservative starting point for Google AI Studio's free tier, not an
// enforced cap -- purely a reference point for the settings-page
// consumption bar. The owner can tune it per key/model from /admin/api-keys.
export const DEFAULT_GEMINI_DAILY_REQUEST_LIMIT = 1000;

export interface AppConfigValue {
  correctionProvider: string | null;
  correctionApiKey: string | null;
  correctionModel: string | null;
  correctionDailyLimit: number | null;
  exampleProvider: string | null;
  exampleApiKey: string | null;
  exampleModel: string | null;
  exampleDailyLimit: number | null;
}

const EMPTY_CONFIG: AppConfigValue = {
  correctionProvider: null,
  correctionApiKey: null,
  correctionModel: null,
  correctionDailyLimit: null,
  exampleProvider: null,
  exampleApiKey: null,
  exampleModel: null,
  exampleDailyLimit: null,
};

function toAppConfigValue(row: {
  correctionProvider: string | null;
  correctionApiKey: string | null;
  correctionModel: string | null;
  correctionDailyLimit: number | null;
  exampleProvider: string | null;
  exampleApiKey: string | null;
  exampleModel: string | null;
  exampleDailyLimit: number | null;
}): AppConfigValue {
  return {
    correctionProvider: row.correctionProvider,
    correctionApiKey: row.correctionApiKey,
    correctionModel: row.correctionModel,
    correctionDailyLimit: row.correctionDailyLimit,
    exampleProvider: row.exampleProvider,
    exampleApiKey: row.exampleApiKey,
    exampleModel: row.exampleModel,
    exampleDailyLimit: row.exampleDailyLimit,
  };
}

/** Resolves a stored (possibly null/invalid) override to an actual provider id. */
export function resolveCorrectionProviderId(value: string | null | undefined): CorrectionProviderId {
  return value && isCorrectionProviderId(value) ? value : DEFAULT_CORRECTION_PROVIDER;
}

/** Resolves a stored (possibly null/invalid) override to an actual provider id. */
export function resolveExampleProviderId(value: string | null | undefined): ExampleProviderId {
  return value && isExampleProviderId(value) ? value : DEFAULT_EXAMPLE_PROVIDER;
}

/** Never throws for a missing row: no admin override yet is a normal state. */
export async function getAppConfig(): Promise<AppConfigValue> {
  const row = await prisma.appConfig.findUnique({ where: { id: CONFIG_ID } });
  return row ? toAppConfigValue(row) : EMPTY_CONFIG;
}

export interface AppConfigUpdateInput {
  correctionProvider?: string | null;
  correctionApiKey?: string | null;
  correctionModel?: string | null;
  correctionDailyLimit?: number | null;
  exampleProvider?: string | null;
  exampleApiKey?: string | null;
  exampleModel?: string | null;
  exampleDailyLimit?: number | null;
}

function normalizeText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value === null || value.trim() === "" ? null : value.trim();
}

/**
 * A field omitted from `patch` is left untouched. For a text field, an empty
 * string (or null) clears it back to its env-var default (see gemini.ts).
 * For a limit field, null clears it back to DEFAULT_GEMINI_DAILY_REQUEST_LIMIT.
 */
export async function updateAppConfig(patch: AppConfigUpdateInput): Promise<AppConfigValue> {
  const normalized: AppConfigUpdateInput = {
    correctionProvider: normalizeText(patch.correctionProvider),
    correctionApiKey: normalizeText(patch.correctionApiKey),
    correctionModel: normalizeText(patch.correctionModel),
    correctionDailyLimit: patch.correctionDailyLimit,
    exampleProvider: normalizeText(patch.exampleProvider),
    exampleApiKey: normalizeText(patch.exampleApiKey),
    exampleModel: normalizeText(patch.exampleModel),
    exampleDailyLimit: patch.exampleDailyLimit,
  };
  for (const key of Object.keys(normalized) as (keyof AppConfigUpdateInput)[]) {
    if (normalized[key] === undefined) delete normalized[key];
  }

  const row = await prisma.appConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, ...normalized },
    update: normalized,
  });

  return toAppConfigValue(row);
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
  dailyLimit: number;
  dailyLimitDefault: number;
  dailyLimitIsDefault: boolean;
  requestsToday: number;
}

export interface AppConfigDisplay {
  correction: AppConfigDisplaySection;
  // The resolved provider id (never null -- see resolveCorrectionProviderId/
  // resolveExampleProviderId) driving which env vars the matching section's
  // apiKeyFromEnv/modelDefault above reflect. Kept as a sibling of its
  // section rather than folded into AppConfigDisplaySection so that generic
  // shape stays reusable regardless of whether a section has a provider
  // concept.
  correctionProvider: CorrectionProviderId;
  example: AppConfigDisplaySection;
  exampleProvider: ExampleProviderId;
}

/**
 * Combines the stored overrides with today's actual request counts (see
 * getGeminiRequestsToday) into the shape the admin settings API and page
 * both render. requestsToday is a self-tracked approximation from our own
 * reservation counters, not a number reported by Google.
 */
export async function getAppConfigDisplay(): Promise<AppConfigDisplay> {
  const [config, requestsToday] = await Promise.all([getAppConfig(), getGeminiRequestsToday()]);
  const correctionProvider = resolveCorrectionProviderId(config.correctionProvider);
  // OpenRouter fronts hundreds of models with no single sane default (unlike
  // Gemini's fixed free-tier default below) -- an admin on this provider
  // must set a model, from the panel or OPENROUTER_CORRECTION_MODEL.
  const correctionApiKeyEnvVar =
    correctionProvider === "openrouter" ? process.env.OPENROUTER_API_KEY : process.env.GEMINI_API_KEY;
  const correctionModelDefault =
    correctionProvider === "openrouter"
      ? process.env.OPENROUTER_CORRECTION_MODEL?.trim() || ""
      : process.env.GEMINI_CORRECTION_MODEL?.trim() || DEFAULT_GEMINI_CORRECTION_MODEL;

  const exampleProvider = resolveExampleProviderId(config.exampleProvider);
  const exampleApiKeyEnvVar =
    exampleProvider === "openrouter" ? process.env.OPENROUTER_API_KEY : process.env.GEMINI_API_KEY;
  const exampleModelDefault =
    exampleProvider === "openrouter"
      ? process.env.OPENROUTER_EXAMPLE_MODEL?.trim() || ""
      : process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  return {
    correction: {
      apiKeySet: Boolean(config.correctionApiKey),
      apiKeyMasked: maskSecret(config.correctionApiKey),
      apiKeyFromEnv: !config.correctionApiKey && Boolean(correctionApiKeyEnvVar?.trim()),
      model: config.correctionModel,
      modelDefault: correctionModelDefault,
      dailyLimit: config.correctionDailyLimit ?? DEFAULT_GEMINI_DAILY_REQUEST_LIMIT,
      dailyLimitDefault: DEFAULT_GEMINI_DAILY_REQUEST_LIMIT,
      dailyLimitIsDefault: config.correctionDailyLimit === null,
      requestsToday: requestsToday.correctionRequestsToday,
    },
    correctionProvider,
    example: {
      apiKeySet: Boolean(config.exampleApiKey),
      apiKeyMasked: maskSecret(config.exampleApiKey),
      apiKeyFromEnv: !config.exampleApiKey && Boolean(exampleApiKeyEnvVar?.trim()),
      model: config.exampleModel,
      modelDefault: exampleModelDefault,
      dailyLimit: config.exampleDailyLimit ?? DEFAULT_GEMINI_DAILY_REQUEST_LIMIT,
      dailyLimitDefault: DEFAULT_GEMINI_DAILY_REQUEST_LIMIT,
      dailyLimitIsDefault: config.exampleDailyLimit === null,
      requestsToday: requestsToday.exampleRequestsToday,
    },
    exampleProvider,
  };
}
