import { z } from "zod";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { getAppConfig } from "@/lib/app-config";
import { checkApiKeyTestRate } from "@/lib/api-key-test-rate-limit";
import { runApiKeyTest } from "@/lib/api-key-test";
import { resolveTestTarget } from "@/lib/api-key-test-target";
import { CORRECTION_PROVIDER_IDS } from "@/lib/correction-provider";

// Same shape and limits as the save route's fields, so the form can send the
// values it is about to save and get the same validation.
const MAX_FIELD_LENGTH = 500;
const textFieldSchema = z.string().max(MAX_FIELD_LENGTH).nullable().optional();

const requestSchema = z
  .object({
    section: z.enum(["correction", "example"]),
    provider: z.enum(CORRECTION_PROVIDER_IDS).nullable().optional(),
    apiKey: textFieldSchema,
    model: textFieldSchema,
  })
  .strict();

/**
 * The admin's "Test" button. Makes one minimal real call (a structured-output
 * call for correction, a plain one for examples) with the values in the form
 * if the admin typed new ones, otherwise the stored ones, resolved the way the
 * real code path would, and reports what happened in plain language.
 *
 * Owner only, rate-limited per admin, sends no essay or learner data, writes
 * nothing, uses no learner quota, and never returns or logs the key. A problem
 * with the call itself (a bad key, an unknown model, a timeout) is a normal 200
 * answer with ok:false; only a malformed request or a rate limit is an error
 * status.
 */
export async function POST(request: Request) {
  const admin = await getAdminApiUser();
  if (!admin) return adminNotFoundResponse();

  const rate = checkApiKeyTestRate(admin.id);
  if (!rate.allowed) {
    const response = adminJsonResponse(
      { error: `Too many tests. Wait ${rate.retryAfterSeconds} seconds and try again.`, code: "API_KEY_TEST_RATE_LIMITED" },
      429,
    );
    response.headers.set("Retry-After", String(rate.retryAfterSeconds));
    return response;
  }

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

  const { section, provider, apiKey, model } = parsed.data;
  const resolved = resolveTestTarget(await getAppConfig(), section, { provider, apiKey, model });
  if ("error" in resolved) return adminJsonResponse({ error: resolved.error }, 400);

  const { target } = resolved;
  const tested = { provider: target.provider, model: target.model, keySource: target.keySource, modelSource: target.modelSource, summary: target.summary };

  if (!target.apiKey || !target.model) {
    const missing = !target.apiKey && !target.model ? "an API key and a model" : !target.apiKey ? "an API key" : "a model";
    return adminJsonResponse({
      result: {
        ok: false,
        kind: "not_configured",
        message: `Nothing to test yet: this section has no ${missing}. Enter ${missing === "an API key and a model" ? "them" : "it"} above, or set the environment variable.`,
        latencyMs: null,
        httpStatus: null,
        model: target.model,
      },
      tested,
    });
  }

  const result = await runApiKeyTest({ section, provider: target.provider, apiKey: target.apiKey, model: target.model });
  return adminJsonResponse({ result, tested });
}
