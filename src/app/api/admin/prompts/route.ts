import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { FEEDBACK_LANGUAGE_TOKEN } from "@/lib/essay-correction-prompt";
import { PROMPT_OVERRIDE_KEYS, getPromptOverridesDisplay, updatePromptOverrides } from "@/lib/prompt-overrides";

// A generous ceiling, not a real format constraint: these are full prompt
// blocks (the built-in defaults themselves run into the thousands of
// characters), not short config values.
const MAX_PROMPT_LENGTH = 20_000;

const promptFieldSchema = z.string().max(MAX_PROMPT_LENGTH).nullable().optional();

const requestSchema = z
  .object(Object.fromEntries(PROMPT_OVERRIDE_KEYS.map((key) => [key, promptFieldSchema])))
  .strict()
  // A nonblank correctionBase override that drops {{feedbackLanguage}}
  // silently removes the only instruction telling Gemini which language to
  // write feedback in -- reject it here rather than let it ship a working
  // request that quietly stops respecting the learner's locale.
  .superRefine((data, ctx) => {
    const base = data.correctionBase;
    if (typeof base === "string" && base.trim() !== "" && !base.includes(FEEDBACK_LANGUAGE_TOKEN)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctionBase"],
        message: `The shared base prompt must include the ${FEEDBACK_LANGUAGE_TOKEN} token, or feedback will no longer reliably use the learner's selected language.`,
      });
    }
  });

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
    // Unlike the public-facing routes, this is an owner-only admin surface
    // with no untrusted caller to worry about leaking detail to -- surface
    // the actual reason (e.g. the missing feedback-language token) rather
    // than a generic message the owner would have to guess at.
    return adminJsonResponse({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
  }

  await updatePromptOverrides(parsed.data);
  return adminJsonResponse(await getPromptOverridesDisplay());
}
