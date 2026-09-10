import { NextResponse } from "next/server";
import { z } from "zod";
import { AppUserProvisioningError } from "@/lib/app-user";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import {
  checkFrenchText,
  LanguageToolNotConfiguredError,
  LanguageToolRequestError,
  type LanguageCheckMatch,
} from "@/lib/language-tool";
import { isLanguageCheckRateLimited } from "@/lib/language-check-rate-limit";
import { recordAdminEvent, type AdminEventReasonCode } from "@/lib/admin-events";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
const LANGUAGE_CHECK_TIMEOUT_MS = 8_000;

// Mirrors the essay editor's own `maxLength` (see the `<textarea>` in
// WritingWorkspace) so this endpoint never has to reject text the editor
// itself could never have produced.
const MAX_TEXT_LENGTH = 20_000;

const requestSchema = z.object({ text: z.string().max(MAX_TEXT_LENGTH) }).strict();

function jsonResponse(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE_HEADERS, ...headers } });
}

function classifyLanguageCheckFailure(error: unknown): AdminEventReasonCode {
  if (error instanceof LanguageToolNotConfiguredError) return "not_configured";
  if (error instanceof LanguageToolRequestError) return "upstream_http_error";
  if (error instanceof DOMException && error.name === "TimeoutError") return "transport_error";
  return "provider_unavailable";
}

function boundedLanguageToolHttpStatus(error: unknown): number | undefined {
  if (!(error instanceof LanguageToolRequestError)) return undefined;
  return Number.isInteger(error.status) && error.status >= 100 && error.status <= 599 ? error.status : undefined;
}

/** Combines the browser's own cancellation with a server-side timeout, the
 * same pattern `/api/translate` uses, so a stuck LanguageTool container
 * cannot hold a request (and its debounce slot) open indefinitely. */
function createLanguageCheckSignal(requestSignal: AbortSignal) {
  const controller = new AbortController();

  const abortForClient = () => controller.abort(requestSignal.reason);
  if (requestSignal.aborted) {
    abortForClient();
  } else {
    requestSignal.addEventListener("abort", abortForClient, { once: true });
  }

  const timeout = setTimeout(() => {
    controller.abort(new DOMException("LanguageTool request timed out.", "TimeoutError"));
  }, LANGUAGE_CHECK_TIMEOUT_MS);

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      requestSignal.removeEventListener("abort", abortForClient);
    },
  };
}

/**
 * Checks French text for spelling, grammar, and (where LanguageTool's own
 * rules find one) missing-word issues. This is the only integration point
 * with LanguageTool: it always talks to the self-hosted server at
 * `LANGUAGETOOL_URL`, never the public API, and returns only the fields the
 * editor needs -- never LanguageTool's raw response.
 */
export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentActivatedAppUser>>;
  try {
    user = await getCurrentActivatedAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return jsonResponse(
        {
          error: "Your account is still being set up. Please try again.",
          code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
        },
        503,
      );
    }
    throw error;
  }

  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  const { text } = parsed.data;
  if (!text.trim()) {
    return jsonResponse({ errors: [] });
  }

  if (isLanguageCheckRateLimited(user.id)) {
    return jsonResponse(
      { error: "Too many grammar-check requests. Please slow down.", code: "LANGUAGE_CHECK_RATE_LIMITED" },
      429,
      { "Retry-After": "10" },
    );
  }

  if (request.signal.aborted) {
    return jsonResponse({ error: "Language check request was cancelled." }, 499);
  }

  const languageCheckSignal = createLanguageCheckSignal(request.signal);
  let errors: LanguageCheckMatch[];
  try {
    errors = await checkFrenchText(text, languageCheckSignal.signal);
  } catch (error) {
    if (request.signal.aborted) {
      return jsonResponse({ error: "Language check request was cancelled." }, 499);
    }

    const reasonCode = classifyLanguageCheckFailure(error);

    if (error instanceof LanguageToolNotConfiguredError) {
      console.error("LANGUAGETOOL_URL is not configured; language check is disabled.");
      await recordAdminEvent({
        eventType: "GRAMMAR_CHECK_PROVIDER_FAILED",
        userId: user.id,
        provider: "languagetool",
        reasonCode,
        httpStatus: 503,
      });
      return jsonResponse(
        { error: "Grammar check is not configured on this server.", code: "LANGUAGE_CHECK_UNAVAILABLE" },
        503,
      );
    }

    console.error("LanguageTool request failed before a response was received", error);
    await recordAdminEvent({
      eventType: "GRAMMAR_CHECK_PROVIDER_FAILED",
      userId: user.id,
      provider: "languagetool",
      reasonCode,
      httpStatus: boundedLanguageToolHttpStatus(error) ?? 502,
    });
    return jsonResponse(
      { error: "Grammar check is temporarily unavailable.", code: "LANGUAGE_CHECK_UNAVAILABLE" },
      502,
    );
  } finally {
    languageCheckSignal.dispose();
  }

  return jsonResponse({ errors });
}
