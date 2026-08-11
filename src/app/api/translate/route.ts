import { NextResponse } from "next/server";
import { z } from "zod";
import { AppUserProvisioningError } from "@/lib/app-user";
import { getCurrentActivatedAppUser } from "@/lib/activated-app-user";
import { APP_LOCALES, TRANSLATABLE_MAX_CHARS } from "@/lib/app-locale";
import { prisma } from "@/lib/prisma";
import { DeepLQuotaExceededError, translateWithDeepL } from "@/lib/deepl-translate";
import { translateWithUnofficialScraper } from "@/lib/unofficial-translate";
import {
  isFallbackCircuitOpen,
  recordFallbackFailure,
  recordFallbackSuccess,
} from "@/lib/translation-fallback-circuit";
import { resolveUserQuotaLimits } from "@/lib/user-quota-limits";
import { recordAdminEvent } from "@/lib/admin-events";

const TRANSLATION_TIMEOUT_MS = 8_000;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

const QUOTA_TRANSACTION_TIMEOUT_MS = 3_000;

const requestSchema = z
  .object({
    text: z
      .string()
      .min(1)
      .max(TRANSLATABLE_MAX_CHARS)
      .refine((text) => text.trim().length > 0, "Text cannot be blank."),
    targetLocale: z.enum(APP_LOCALES),
  })
  .strict();

type QuotaReservation =
  | { allowed: true }
  | {
      allowed: false;
      reason: "rate" | "monthly";
      resetAt: Date;
    };

function startOfUtcMinute(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
    ),
  );
}

function startOfUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfNextUtcMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function isSameWindow(left: Date, right: Date) {
  return left.getTime() === right.getTime();
}

// Both DeepL and Google meter Unicode code points, not UTF-16 code units.
// This matches that billing model even for text containing astral-plane
// characters.
function countCodePoints(text: string) {
  return Array.from(text).length;
}

function retryAfterSeconds(now: Date, resetAt: Date) {
  return Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1_000));
}

async function reserveTranslationQuota(userId: string, characterCount: number): Promise<QuotaReservation> {
  return prisma.$transaction(
    async (tx) => {
      // A unique row alone is not enough for a read/modify/write limit: two
      // server instances could both read the same remaining allowance. This
      // PostgreSQL transaction-scoped lock serializes all quota reservations
      // for this learner without blocking other learners.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId})::bigint)`;

      const now = new Date();
      const minuteStartedAt = startOfUtcMinute(now);
      const monthStartedAt = startOfUtcMonth(now);
      const minuteResetsAt = new Date(minuteStartedAt.getTime() + 60_000);
      const monthResetsAt = startOfNextUtcMonth(now);
      const [existing, overrides] = await Promise.all([
        tx.translationQuota.findUnique({ where: { userId } }),
        tx.userQuotaOverride.findUnique({
          where: { userId },
          select: {
            translationRequestsPerMinute: true,
            translationCharactersPerMinute: true,
            translationCharactersPerMonth: true,
          },
        }),
      ]);
      const limits = resolveUserQuotaLimits(overrides);

      const continuingMinute =
        existing !== null && isSameWindow(existing.minuteStartedAt, minuteStartedAt);
      const continuingMonth =
        existing !== null && isSameWindow(existing.monthStartedAt, monthStartedAt);
      const minuteRequestCount = (continuingMinute ? existing.minuteRequestCount : 0) + 1;
      const minuteCharacterCount =
        (continuingMinute ? existing.minuteCharacterCount : 0) + characterCount;
      const monthCharacterCount =
        (continuingMonth ? existing.monthCharacterCount : 0) + characterCount;

      if (
        minuteRequestCount > limits.translationRequestsPerMinute ||
        minuteCharacterCount > limits.translationCharactersPerMinute
      ) {
        return { allowed: false, reason: "rate", resetAt: minuteResetsAt };
      }

      if (monthCharacterCount > limits.translationCharactersPerMonth) {
        return { allowed: false, reason: "monthly", resetAt: monthResetsAt };
      }

      const data = {
        minuteStartedAt,
        minuteRequestCount,
        minuteCharacterCount,
        monthStartedAt,
        monthCharacterCount,
      };

      await tx.translationQuota.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });

      return { allowed: true };
    },
    { timeout: QUOTA_TRANSACTION_TIMEOUT_MS },
  );
}

function createTranslationSignal(requestSignal: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;

  const abortForClient = () => controller.abort(requestSignal.reason);
  if (requestSignal.aborted) {
    abortForClient();
  } else {
    requestSignal.addEventListener("abort", abortForClient, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Translation request timed out.", "TimeoutError"));
  }, TRANSLATION_TIMEOUT_MS);

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timeout);
      requestSignal.removeEventListener("abort", abortForClient);
    },
  };
}

function translationResponse(
  body: Record<string, string>,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...headers },
  });
}

export async function POST(request: Request) {
  let user: Awaited<ReturnType<typeof getCurrentActivatedAppUser>>;
  try {
    user = await getCurrentActivatedAppUser();
  } catch (error) {
    if (error instanceof AppUserProvisioningError) {
      return translationResponse(
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
    return translationResponse({ error: "Unauthorized" }, 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return translationResponse({ error: "Invalid request." }, 400);
  }

  const { text, targetLocale } = parsed.data;

  // The draft is already French. Avoid an unnecessary translation request
  // when the learner has selected the French interface.
  if (targetLocale === "fr") {
    return translationResponse({ translation: text, provider: "source" });
  }

  // A missing key means only the unofficial scraper fallback is available;
  // that path is attempted further down instead of failing the request here.
  const deeplApiKey = process.env.DEEPL_API_KEY?.trim();

  if (request.signal.aborted) {
    return translationResponse({ error: "Translation request was cancelled." }, 499);
  }

  let quotaReservation: QuotaReservation;
  try {
    quotaReservation = await reserveTranslationQuota(user.id, countCodePoints(text));
  } catch {
    // Fail closed: if usage cannot be recorded durably, do not make an
    // unmetered call with the shared server-side DeepL credential.
    console.error("Translation quota reservation failed");
    return translationResponse(
      {
        error: "Translation service is temporarily unavailable.",
        code: "TRANSLATION_QUOTA_UNAVAILABLE",
      },
      503,
    );
  }

  if (!quotaReservation.allowed) {
    const resetAt = quotaReservation.resetAt.toISOString();
    await recordAdminEvent({
      eventType: "TRANSLATION_QUOTA_DENIED",
      userId: user.id,
      reasonCode: quotaReservation.reason === "rate" ? "minute_limit" : "monthly_limit",
      httpStatus: 429,
      quotaWindow: quotaReservation.reason === "rate" ? "minute" : "month",
    });
    return translationResponse(
      {
        error: "Translation service is temporarily unavailable.",
        code:
          quotaReservation.reason === "rate"
            ? "TRANSLATION_RATE_LIMITED"
            : "TRANSLATION_MONTHLY_QUOTA_REACHED",
        resetAt,
      },
      429,
      { "Retry-After": String(retryAfterSeconds(new Date(), quotaReservation.resetAt)) },
    );
  }

  if (request.signal.aborted) {
    // Reservations intentionally count accepted attempts, even if the client
    // disconnects just after the durable write. Releasing here could race a
    // newer reservation for the same user and reopen the quota bypass; this
    // path never reaches a provider, so it can only consume the caller's own
    // conservative allowance.
    return translationResponse({ error: "Translation request was cancelled." }, 499);
  }

  const translationRequest = createTranslationSignal(request.signal);
  const attemptedProvider = deeplApiKey ? "deepl_or_unofficial" : "unofficial";

  try {
    if (deeplApiKey) {
      try {
        const translation = await translateWithDeepL(
          text,
          targetLocale,
          deeplApiKey,
          translationRequest.signal,
        );
        return translationResponse({ translation, provider: "deepl" });
      } catch (error) {
        if (!(error instanceof DeepLQuotaExceededError)) {
          throw error;
        }

        // Only quota exhaustion falls through to the unofficial scraper
        // below; every other DeepL failure is handled by the outer catch.
        console.warn("DeepL monthly quota exhausted; falling back to the unofficial scraper.");
      }
    }

    if (await isFallbackCircuitOpen()) {
      await recordAdminEvent({
        eventType: "TRANSLATION_PROVIDER_FAILED",
        userId: user.id,
        provider: attemptedProvider,
        reasonCode: "fallback_circuit_open",
        httpStatus: 503,
      });
      return translationResponse(
        {
          error: "Translation service is temporarily unavailable.",
          code: "TRANSLATION_FALLBACK_UNAVAILABLE",
        },
        503,
      );
    }

    try {
      const fallbackTranslation = await translateWithUnofficialScraper(
        text,
        targetLocale,
        translationRequest.signal,
      );
      await recordFallbackSuccess();
      return translationResponse({ translation: fallbackTranslation, provider: "unofficial" });
    } catch (error) {
      await recordFallbackFailure();
      throw error;
    }
  } catch {
    if (request.signal.aborted) {
      return translationResponse({ error: "Translation request was cancelled." }, 499);
    }

    if (translationRequest.timedOut()) {
      await recordAdminEvent({
        eventType: "TRANSLATION_PROVIDER_FAILED",
        userId: user.id,
        provider: attemptedProvider,
        reasonCode: "transport_error",
        httpStatus: 504,
      });
      return translationResponse({ error: "Translation request timed out." }, 504);
    }

    // Do not log the thrown error: an implementation may include the request
    // URL, which contains a server-only API key.
    await recordAdminEvent({
      eventType: "TRANSLATION_PROVIDER_FAILED",
      userId: user.id,
      provider: attemptedProvider,
      reasonCode: "provider_unavailable",
      httpStatus: 502,
    });
    console.error("Translation request failed before a response was received");
    return translationResponse({ error: "Translation service is temporarily unavailable." }, 502);
  } finally {
    translationRequest.dispose();
  }
}
