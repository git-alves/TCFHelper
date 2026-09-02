import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { getAppConfigDisplay, toAppConfigDisplay, updateAppConfig } from "@/lib/app-config";

// A generous ceiling, not a real format constraint: provider keys and model
// names have no fixed shape worth validating beyond "not absurdly long".
const MAX_FIELD_LENGTH = 500;

const fieldSchema = z.string().max(MAX_FIELD_LENGTH).nullable().optional();

const requestSchema = z
  .object({
    correctionApiKey: fieldSchema,
    correctionModel: fieldSchema,
    exampleApiKey: fieldSchema,
    exampleModel: fieldSchema,
  })
  .strict();

export async function GET() {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  return adminJsonResponse(await getAppConfigDisplay());
}

/**
 * A field omitted from the request body is left untouched. An empty string
 * (or null) clears it back to its env-var default. The client only ever
 * sends a field it actually changed, so a masked placeholder can never be
 * echoed back in and overwrite the real stored key.
 */
export async function PUT(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return adminJsonResponse({ error: "Invalid request." }, 400);
  }

  const updated = await updateAppConfig(parsed.data);
  return adminJsonResponse(toAppConfigDisplay(updated));
}
