import {
  isCorrectionProviderId,
  type CorrectionProviderId,
} from "@/lib/correction-provider";
import { validateApiKey, validateModel, type ModelProvider } from "@/lib/api-key-validation";
import type { AppConfigUpdateInput, AppConfigValue } from "@/lib/app-config";

export type ConfigSection = "correction" | "example";

const SECTION_LABEL: Record<ConfigSection, string> = { correction: "Essay correction", example: "Example generation" };
const PROVIDER_LABEL: Record<ModelProvider, string> = { gemini: "Gemini Direct", openrouter: "OpenRouter" };

// What each section's model falls back to when nothing is stored, for the one
// check that depends on it: a switch to OpenRouter needs a model from somewhere.
function openRouterEnvModel(section: ConfigSection) {
  return (section === "correction" ? process.env.OPENROUTER_CORRECTION_MODEL : process.env.OPENROUTER_EXAMPLE_MODEL)?.trim() || "";
}

function resolveProvider(value: string | null | undefined): ModelProvider {
  return value && isCorrectionProviderId(value) ? (value as CorrectionProviderId) : "gemini";
}

// The request body fields of one section, with their PUT meaning: omitted =
// leave untouched, "" or null = clear, anything else = set.
export interface SectionPatch {
  provider?: string | null;
  apiKey?: string | null;
  model?: string | null;
}

export function sectionPatchFromBody(body: Record<string, unknown>, section: ConfigSection): SectionPatch {
  const pick = (suffix: "Provider" | "ApiKey" | "Model") => body[`${section}${suffix}`] as string | null | undefined;
  return { provider: pick("Provider"), apiKey: pick("ApiKey"), model: pick("Model") };
}

function isSupplied(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function storedFor(config: AppConfigValue, section: ConfigSection) {
  return section === "correction"
    ? { provider: config.correctionProvider, apiKey: config.correctionApiKey, model: config.correctionModel }
    : { provider: config.exampleProvider, apiKey: config.exampleApiKey, model: config.exampleModel };
}

export interface PlannedSection {
  /** The provider this section will use after the change. */
  provider: ModelProvider;
  /** True when this change moves the section to a different provider. */
  switched: boolean;
  /** The key and model this section will have after the change (null = none stored). */
  apiKey: string | null;
  model: string | null;
  /** The DB fields to write for this section (only what changes). */
  update: Pick<AppConfigUpdateInput, "correctionProvider" | "correctionApiKey" | "correctionModel"> & Pick<AppConfigUpdateInput, "exampleProvider" | "exampleApiKey" | "exampleModel">;
  /** A message for the admin when the change must be refused. */
  error?: string;
}

/**
 * Works out what saving `patch` does to one section, against what is stored.
 *
 * Clear-on-switch: a stored key and model belong to the provider they were
 * saved for, so when the change moves the section to a different provider they
 * are removed, unless the same request supplies new ones. (Otherwise the old
 * provider's key and model would be sent to the new provider.) Switching to
 * OpenRouter also needs a model, either typed here or from the environment.
 * Typed keys and models are validated against the provider the section ends up
 * on. A provider that is unchanged (including null versus "gemini", which are
 * the same provider) is not a switch.
 */
export function planSectionUpdate(config: AppConfigValue, section: ConfigSection, patch: SectionPatch): PlannedSection {
  const stored = storedFor(config, section);
  const storedProvider = resolveProvider(stored.provider);
  const provider = patch.provider === undefined ? storedProvider : resolveProvider(patch.provider);
  const switched = provider !== storedProvider;
  const label = SECTION_LABEL[section];

  const update: PlannedSection["update"] = {};
  const keys = {
    provider: section === "correction" ? "correctionProvider" : "exampleProvider",
    apiKey: section === "correction" ? "correctionApiKey" : "exampleApiKey",
    model: section === "correction" ? "correctionModel" : "exampleModel",
  } as const;

  if (patch.provider !== undefined) update[keys.provider] = patch.provider;

  // Validate what the admin typed, against the provider it will be used with.
  if (isSupplied(patch.apiKey)) {
    const problem = validateApiKey(patch.apiKey.trim());
    if (problem) return { provider, switched, apiKey: stored.apiKey, model: stored.model, update, error: `${label}: ${problem}` };
  }
  if (isSupplied(patch.model)) {
    const problem = validateModel(provider, patch.model.trim());
    if (problem) return { provider, switched, apiKey: stored.apiKey, model: stored.model, update, error: `${label}: ${problem}` };
  }

  let apiKey = stored.apiKey;
  let model = stored.model;
  if (switched) {
    apiKey = null;
    model = null;
    update[keys.apiKey] = null;
    update[keys.model] = null;
  }
  if (patch.apiKey !== undefined) {
    apiKey = isSupplied(patch.apiKey) ? patch.apiKey.trim() : null;
    update[keys.apiKey] = patch.apiKey;
  }
  if (patch.model !== undefined) {
    model = isSupplied(patch.model) ? patch.model.trim() : null;
    update[keys.model] = patch.model;
  }

  if (switched && provider === "openrouter" && !model && !openRouterEnvModel(section)) {
    return {
      provider,
      switched,
      apiKey,
      model,
      update,
      error: `${label}: OpenRouter has no default model, so choose one before switching to it (for example qwen/qwen3-30b-a3b).`,
    };
  }

  return { provider, switched, apiKey, model, update };
}

export { PROVIDER_LABEL };
