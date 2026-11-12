import type { AppConfigValue } from "@/lib/app-config";
import { planSectionUpdate, sectionPatchFromBody, type ConfigSection, type SectionPatch } from "@/lib/app-config-update";
import type { ModelProvider } from "@/lib/api-key-validation";
import { getCorrectionProvider } from "@/lib/correction-provider-registry";
import { getExampleProvider } from "@/lib/example-provider-registry";

export type KeySource = "form" | "saved" | "environment";
export type ModelSource = "form" | "saved" | "environment" | "default";

export interface TestTarget {
  provider: ModelProvider;
  apiKey: string | null;
  model: string | null;
  keySource: KeySource | null;
  modelSource: ModelSource | null;
  /** One sentence saying exactly what was tested, never containing the key. */
  summary: string;
}

const PROVIDER_NAME: Record<ModelProvider, string> = { gemini: "Gemini", openrouter: "OpenRouter" };

function keyEnvName(provider: ModelProvider) {
  return provider === "openrouter" ? "OPENROUTER_API_KEY" : "GEMINI_API_KEY";
}

function modelEnvName(provider: ModelProvider, section: ConfigSection) {
  if (provider === "openrouter") return section === "correction" ? "OPENROUTER_CORRECTION_MODEL" : "OPENROUTER_EXAMPLE_MODEL";
  return section === "correction" ? "GEMINI_CORRECTION_MODEL" : "GEMINI_MODEL";
}

function isSupplied(value: string | null | undefined) {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Resolves what the Test button should call, the way the real code path would
 * after the form were saved:
 *  - the form's values win over the stored ones (an omitted field means "leave
 *    what is stored"; an empty one means "clear it", as on save);
 *  - a provider that differs from the stored one drops the stored key and
 *    model (the clear-on-switch rule), because a save would remove them;
 *  - anything still missing falls back to the provider's environment variable
 *    or built-in default, exactly as the adapters do.
 * Returns an error message for the admin when a typed value is not valid.
 */
export function resolveTestTarget(
  config: AppConfigValue,
  section: ConfigSection,
  patch: SectionPatch,
): { error: string } | { target: TestTarget } {
  const plan = planSectionUpdate(config, section, patch, { requireOpenRouterModel: false });
  if (plan.error) return { error: plan.error };

  const provider = plan.provider;
  const envKey = process.env[keyEnvName(provider)]?.trim() || null;
  const apiKey = plan.apiKey ?? envKey;
  const keySource: KeySource | null = isSupplied(patch.apiKey) ? "form" : plan.apiKey ? "saved" : envKey ? "environment" : null;

  // The adapter owns the model fallback (its environment variable, or the
  // built-in default), so the target never drifts from the real call.
  const adapter = section === "correction" ? getCorrectionProvider(provider) : getExampleProvider(provider);
  const model = adapter.resolveModel({ apiKey: plan.apiKey, model: plan.model });
  const modelEnv = process.env[modelEnvName(provider, section)]?.trim();
  const modelSource: ModelSource | null = isSupplied(patch.model)
    ? "form"
    : plan.model
      ? "saved"
      : model
        ? modelEnv
          ? "environment"
          : "default"
        : null;

  const keyPhrase =
    keySource === "form"
      ? "the key typed in the form (not saved yet)"
      : keySource === "saved"
        ? "the key saved in this panel"
        : keySource === "environment"
          ? `the ${keyEnvName(provider)} environment variable`
          : "no key";
  const modelPhrase =
    modelSource === "form"
      ? "the model typed in the form"
      : modelSource === "saved"
        ? "the model saved here"
        : modelSource === "environment"
          ? `the model from ${modelEnvName(provider, section)}`
          : modelSource === "default"
            ? "the built-in default model"
            : "no model";

  return {
    target: {
      provider,
      apiKey,
      model,
      keySource,
      modelSource,
      summary: `Tested ${PROVIDER_NAME[provider]} with ${keyPhrase} and ${modelPhrase}.`,
    },
  };
}

export { sectionPatchFromBody };
