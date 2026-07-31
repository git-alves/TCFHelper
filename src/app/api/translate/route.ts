import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { APP_LOCALES, TRANSLATABLE_MAX_CHARS } from "@/lib/app-locale";

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";
const TRANSLATION_TIMEOUT_MS = 8_000;
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

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

function translationResponse(body: Record<string, string>, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
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
