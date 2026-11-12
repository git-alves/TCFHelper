import { describe, expect, it } from "vitest";
import { classifyCorrectionFailure, formatResetTime } from "./correction-error";

describe("classifyCorrectionFailure", () => {
  it("recognises the daily limit and carries a valid reset time", () => {
    expect(
      classifyCorrectionFailure(429, { code: "CORRECTION_DAILY_LIMIT_REACHED", resetAt: "2026-11-13T00:00:00.000Z" }),
    ).toEqual({ kind: "dailyLimit", resetAt: "2026-11-13T00:00:00.000Z" });
  });

  it("recognises the daily limit without a usable reset time", () => {
    expect(classifyCorrectionFailure(429, { code: "CORRECTION_DAILY_LIMIT_REACHED" })).toEqual({
      kind: "dailyLimit",
      resetAt: null,
    });
    expect(classifyCorrectionFailure(429, { code: "CORRECTION_DAILY_LIMIT_REACHED", resetAt: "soon" })).toEqual({
      kind: "dailyLimit",
      resetAt: null,
    });
  });

  it("maps an expired session, a busy or failing service, and everything else", () => {
    expect(classifyCorrectionFailure(401, { error: "Unauthorized" })).toEqual({ kind: "sessionExpired" });
    expect(classifyCorrectionFailure(502, null)).toEqual({ kind: "busy" });
    expect(classifyCorrectionFailure(503, { code: "CORRECTION_SERVICE_UNAVAILABLE" })).toEqual({ kind: "busy" });
    expect(classifyCorrectionFailure(504, null)).toEqual({ kind: "generic" });
    expect(classifyCorrectionFailure(400, { error: "Unknown topic." })).toEqual({ kind: "generic" });
    // A 429 that is not the daily limit is not described as one.
    expect(classifyCorrectionFailure(429, { code: "SOMETHING_ELSE" })).toEqual({ kind: "generic" });
  });
});

describe("formatResetTime", () => {
  const resetAt = "2026-11-13T00:00:00.000Z";
  const local = new Date(resetAt);
  const hh = String(local.getHours()).padStart(2, "0");
  const mm = String(local.getMinutes()).padStart(2, "0");

  it("uses 24-hour HH:mm in the learner's local time for Portuguese, French and Spanish", () => {
    for (const locale of ["pt", "fr", "es"] as const) {
      expect(formatResetTime(resetAt, locale)).toBe(`${hh}:${mm}`);
    }
  });

  it("uses the English default (12-hour with AM/PM) for English", () => {
    expect(formatResetTime(resetAt, "en")).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
  });

  it("writes midnight as 00:00, never 24:00", () => {
    const midnight = new Date(2026, 10, 13, 0, 0, 0).toISOString();
    expect(formatResetTime(midnight, "pt")).toBe("00:00");
  });
});
