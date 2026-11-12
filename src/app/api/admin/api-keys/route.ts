import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { getAppConfig, getAppConfigDisplay, updateAppConfig } from "@/lib/app-config";
import { planSectionUpdate, sectionPatchFromBody } from "@/lib/app-config-update";
import { CORRECTION_PROVIDER_IDS } from "@/lib/correction-provider";
import { EXAMPLE_PROVIDER_IDS } from "@/lib/example-provider";

// A generous ceiling, not a real format constraint: provider keys and model
// names have no fixed shape worth validating beyond "not absurdly long".
const MAX_FIELD_LENGTH = 500;
const MAX_DAILY_LIMIT = 1_000_000;

const textFieldSchema = z.string().max(MAX_FIELD_LENGTH).nullable().optional();
const limitFieldSchema = z.number().int().min(1).max(MAX_DAILY_LIMIT).nullable().optional();
// Unlike the free-text fields above, a provider field is a closed set: it
// selects which CorrectionProvider/ExampleProvider adapter (correction-provider.ts /
// example-provider.ts) actually runs, so an unrecognized value must be
// rejected here rather than stored.
const correctionProviderFieldSchema = z.enum(CORRECTION_PROVIDER_IDS).nullable().optional();
const exampleProviderFieldSchema = z.enum(EXAMPLE_PROVIDER_IDS).nullable().optional();

const requestSchema = z
  .object({
    correctionProvider: correctionProviderFieldSchema,
    correctionApiKey: textFieldSchema,
    correctionModel: textFieldSchema,
    correctionDailyLimit: limitFieldSchema,
    exampleProvider: exampleProviderFieldSchema,
    exampleApiKey: textFieldSchema,
    exampleModel: textFieldSchema,
    exampleDailyLimit: limitFieldSchema,
  })
  .strict();

export async function GET() {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  return adminJsonResponse(await getAppConfigDisplay());
}

/**
 * A field omitted from the request body is left untouched. An empty string
 * (or null) clears a key/model back to its env-var default; null clears a
 * daily limit back to DEFAULT_GEMINI_DAILY_REQUEST_LIMIT. The client only
 * ever sends a key it actually changed, and the server also refuses any key
 * that is not a plausible key (see validateApiKey), so a masked placeholder
 * can never overwrite the real stored key.
 *
 * Moving a section to a different provider removes that section's stored key
 * and model unless the same request supplies new ones (see planSectionUpdate),
 * so one provider's key and model are never sent to another.
 */
export async function PUT(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return adminJsonResponse({ error: "The request body must be valid JSON." }, 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    // Name the field, never its value: it may be a key.
    const field = parsed.error.issues[0]?.path.join(".");
    return adminJsonResponse({ error: field ? `Invalid value for ${field}.` : "Invalid request." }, 400);
  }

  const config = await getAppConfig();
  const correction = planSectionUpdate(config, "correction", sectionPatchFromBody(parsed.data, "correction"));
  const example = planSectionUpdate(config, "example", sectionPatchFromBody(parsed.data, "example"));
  const error = correction.error ?? example.error;
  if (error) return adminJsonResponse({ error }, 400);

  await updateAppConfig({
    ...correction.update,
    ...example.update,
    ...(parsed.data.correctionDailyLimit !== undefined ? { correctionDailyLimit: parsed.data.correctionDailyLimit } : {}),
    ...(parsed.data.exampleDailyLimit !== undefined ? { exampleDailyLimit: parsed.data.exampleDailyLimit } : {}),
  });
  return adminJsonResponse(await getAppConfigDisplay());
}
