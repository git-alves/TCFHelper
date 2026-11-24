import { describe, expect, it } from "vitest";
import { calendarDaysUntil, isAccessExpiryDismissed, isAccessExpiryWarning, isLearnerAppPath, localCalendarDayKey } from "./access-code-expiry-warning";

describe("access expiry warnings", () => {
  const now = new Date("2026-08-01T22:00:00.000Z");
  const zone = "America/Sao_Paulo";

  it.each([
    [8, false],
    [7, true],
    [1, true],
    [0, true],
    [-1, false],
  ])("shows a warning only from today through seven calendar days (%i days)", (days, expected) => {
    const expiresAt = new Date(Date.UTC(2026, 7, 1 + days, 3));
    expect(isAccessExpiryWarning(calendarDaysUntil(expiresAt, now, zone))).toBe(expected);
  });

  it("uses the learner's local calendar day for dismissal keys", () => {
    expect(localCalendarDayKey(now, zone)).toBe("2026-08-01");
    expect(localCalendarDayKey(new Date("2026-08-02T03:00:00.000Z"), zone)).toBe("2026-08-02");
  });

  it("shows a dismissed warning again on the learner's next calendar day", () => {
    const storage = { getItem: () => "2026-08-01" } as Pick<Storage, "getItem">;
    expect(isAccessExpiryDismissed(storage, "code_1", "2026-08-01")).toBe(true);
    expect(isAccessExpiryDismissed(storage, "code_1", "2026-08-02")).toBe(false);
  });

  it("limits the banner to learner workspace routes", () => {
    expect(isLearnerAppPath("/tasks")).toBe(true);
    expect(isLearnerAppPath("/dashboard/history/id")).toBe(true);
    expect(isLearnerAppPath("/activate")).toBe(false);
    expect(isLearnerAppPath("/admin/users")).toBe(false);
  });
});
