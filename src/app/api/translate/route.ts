import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { APP_LOCALES, TRANSLATABLE_MAX_CHARS } from "@/lib/app-locale";
import { prisma } from "@/lib/prisma";

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";
const TRANSLATION_TIMEOUT_MS = 8_000;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

// Google documents a default quota of 6,000,000 input code points per
// project/user each minute and recommends requests of at most 5,000 code
// points. These tighter product limits still allow a debounced live update
// about every three seconds, while preventing a direct caller from consuming
// the shared Google project quota at that provider-scale rate.
const TRANSLATION_REQUESTS_PER_MINUTE = 20;
const TRANSLATION_CHARACTERS_PER_MINUTE = 20_000;
const TRANSLATION_CHARACTERS_PER_MONTH = 50_000;
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

type JsonRecord = Record<string, unknown>;
type QuotaReservation =
  | { allowed: true }
  | {
      allowed: false;
      reason: "rate" | "monthly";
      resetAt: Date;
    };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: '"',
  };

  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (entity, value) => {
    if (value[0] !== "#") {
      return namedEntities[value.toLowerCase()] ?? entity;
    }

    const codePoint = Number.parseInt(value.slice(value[1].toLowerCase() === "x" ? 2 : 1), value[1].toLowerCase() === "x" ? 16 : 10);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
      return entity;
    }

    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return entity;
    }
  });
}

function getTranslation(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.translations)) {
    return null;
  }

  const firstTranslation = payload.data.translations[0];
  if (!isRecord(firstTranslation) || typeof firstTranslation.translatedText !== "string") {
    return null;
  }

  const translation = decodeHtmlEntities(firstTranslation.translatedText).trim();
  return translation || null;
}

function getGoogleErrorMetadata(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return {};
  }

  return {
    googleCode: typeof payload.error.code === "number" ? payload.error.code : undefined,
    googleStatus: typeof payload.error.status === "string" ? payload.error.status : undefined,
  };
}

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

// Cloud Translation meters Unicode code points, not UTF-16 code units. This
// matches its billing model even for text containing astral-plane characters.
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
      const existing = await tx.translationQuota.findUnique({ where: { userId } });

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
        minuteRequestCount > TRANSLATION_REQUESTS_PER_MINUTE ||
        minuteCharacterCount > TRANSLATION_CHARACTERS_PER_MINUTE
      ) {
        return { allowed: false, reason: "rate", resetAt: minuteResetsAt };
      }

      if (monthCharacterCount > TRANSLATION_CHARACTERS_PER_MONTH) {
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
  const session = await auth();
  if (!session?.user) {
    return translationResponse({ error: "Unauthorized" }, 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return translationResponse({ error: "Invalid request." }, 400);
  }

  const { text, targetLocale } = parsed.data;

  // The draft is already French. Avoid an unnecessary paid API request when
  // the learner has selected the French interface.
  if (targetLocale === "fr") {
    return translationResponse({ translation: text });
  }

  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!apiKey) {
    return translationResponse(
      {
        error: "Translation service is not configured.",
        code: "TRANSLATION_NOT_CONFIGURED",
      },
      503,
    );
  }

  if (request.signal.aborted) {
    return translationResponse({ error: "Translation request was cancelled." }, 499);
  }

  let quotaReservation: QuotaReservation;
  try {
    quotaReservation = await reserveTranslationQuota(session.user.id, countCodePoints(text));
  } catch {
    // Fail closed: if usage cannot be recorded durably, do not make an
    // unmetered call with the shared server-side Google credential.
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
    // path never reaches Google, so it can only consume the caller's own
    // conservative allowance.
    return translationResponse({ error: "Translation request was cancelled." }, 499);
  }

  const translationRequest = createTranslationSignal(request.signal);

  try {
    const response = await fetch(GOOGLE_TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Keep the key out of URLs, traces, and error messages. This header
        // is supported by Google APIs for API-key authentication.
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q: text,
        source: "fr",
        target: targetLocale,
        format: "text",
      }),
      signal: translationRequest.signal,
      cache: "no-store",
    });

    const payload: unknown = await response.json().catch(() => null);

    if (request.signal.aborted) {
      return translationResponse({ error: "Translation request was cancelled." }, 499);
    }

    if (!response.ok) {
      console.error("Google Translation API request failed", {
        status: response.status,
        ...getGoogleErrorMetadata(payload),
      });
      return translationResponse({ error: "Translation service is temporarily unavailable." }, 502);
    }

    const translation = getTranslation(payload);
    if (!translation) {
      return translationResponse({ error: "No translation was returned." }, 502);
    }

    return translationResponse({ translation });
  } catch {
    if (request.signal.aborted) {
      return translationResponse({ error: "Translation request was cancelled." }, 499);
    }

    if (translationRequest.timedOut()) {
      return translationResponse({ error: "Translation request timed out." }, 504);
    }

    // Do not log the thrown error: an implementation may include the request
    // URL, which contains the server-only Google API key.
    console.error("Google Translation API request failed before a response was received");
    return translationResponse({ error: "Translation service is temporarily unavailable." }, 502);
  } finally {
    translationRequest.dispose();
  }
}
