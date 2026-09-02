import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { getAppConfigDisplay, updateAppConfig } from "@/lib/app-config";

// A generous ceiling, not a real format constraint: provider keys and model
// names have no fixed shape worth validating beyond "not absurdly long".
const MAX_FIELD_LENGTH = 500;
const MAX_DAILY_LIMIT = 1_000_000;

const textFieldSchema = z.string().max(MAX_FIELD_LENGTH).nullable().optional();
const limitFieldSchema = z.number().int().min(1).max(MAX_DAILY_LIMIT).nullable().optional();

const requestSchema = z
  .object({
    correctionApiKey: textFieldSchema,
    correctionModel: textFieldSchema,
    correctionDailyLimit: limitFieldSchema,
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
 * ever sends a field it actually changed, so a masked placeholder can never
 * be echoed back in and overwrite the real stored key.
 */
export async function PUT(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return adminJsonResponse({ error: "Invalid request." }, 400);
  }

  await updateAppConfig(parsed.data);
  return adminJsonResponse(await getAppConfigDisplay());
}
