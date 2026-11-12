// What a failed correction request means to the learner. The workspace keeps
// this as a state (not a translated string) so the message follows the
// interface language current when it is shown.

import type { AppLocale } from "@/lib/app-locale";

export type CorrectionErrorState =
  | { kind: "dailyLimit"; resetAt: string | null }
  | { kind: "busy" }
  | { kind: "sessionExpired" }
  | { kind: "generic" };

function validIsoDate(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** Maps a non-OK /api/essays/correct answer to the message the learner should see. */
export function classifyCorrectionFailure(status: number, data: unknown): CorrectionErrorState {
  const body = data && typeof data === "object" ? (data as { code?: unknown; resetAt?: unknown }) : {};
  if (status === 429 && body.code === "CORRECTION_DAILY_LIMIT_REACHED") {
    return { kind: "dailyLimit", resetAt: validIsoDate(body.resetAt) };
  }
  if (status === 401) return { kind: "sessionExpired" };
  // The provider failed or is overloaded, or the service is briefly unavailable.
  if (status === 502 || status === 503) return { kind: "busy" };
  return { kind: "generic" };
}

/** The reset moment in the learner's local time: HH:mm (24h) except in English, which uses its own default. */
export function formatResetTime(resetAt: string, locale: AppLocale): string {
  const date = new Date(resetAt);
  if (locale === "en") {
    return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
  }
  const tag = locale === "pt" ? "pt-BR" : locale;
  return new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}
