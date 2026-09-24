import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { PROMPT_OVERRIDE_KEYS, getPromptOverridesDisplay, updatePromptOverrides } from "@/lib/prompt-overrides";

// A generous ceiling, not a real format constraint: these are full prompt
// blocks (the built-in defaults themselves run into the thousands of
// characters), not short config values.
const MAX_PROMPT_LENGTH = 20_000;

const promptFieldSchema = z.string().max(MAX_PROMPT_LENGTH).nullable().optional();

const requestSchema = z
  .object(Object.fromEntries(PROMPT_OVERRIDE_KEYS.map((key) => [key, promptFieldSchema])))
  .strict();

export async function GET() {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  return adminJsonResponse(await getPromptOverridesDisplay());
}

/**
 * A key omitted from the request body is left untouched. An empty string
 * (or null) clears that block back to its built-in default.
 */
export async function PUT(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return adminJsonResponse({ error: "Invalid request." }, 400);
  }

  await updatePromptOverrides(parsed.data);
  return adminJsonResponse(await getPromptOverridesDisplay());
}
