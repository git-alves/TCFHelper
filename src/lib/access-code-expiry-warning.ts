export const ACCESS_EXPIRY_WARNING_DAYS = 7;
export const ACCESS_EXPIRY_SUPPORT_HREF = "/support";

function dateParts(date: Date, timeZone: string | null): [number, number, number] {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone ?? "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return [value("year"), value("month"), value("day")];
  } catch {
    return dateParts(date, "UTC");
  }
}

/** Calendar-day difference in the learner's zone (0 today, 1 tomorrow). */
export function calendarDaysUntil(expiresAt: Date, now: Date, timeZone: string | null): number {
  const [expiryYear, expiryMonth, expiryDay] = dateParts(expiresAt, timeZone);
  const [todayYear, todayMonth, todayDay] = dateParts(now, timeZone);
  return Math.round(
    (Date.UTC(expiryYear, expiryMonth - 1, expiryDay) - Date.UTC(todayYear, todayMonth - 1, todayDay)) / 86_400_000,
  );
}

export function localCalendarDayKey(now: Date, timeZone: string | null): string {
  const [year, month, day] = dateParts(now, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isAccessExpiryWarning(days: number): boolean {
  return days >= 0 && days <= ACCESS_EXPIRY_WARNING_DAYS;
}

export function accessExpiryDismissalStorageKey(accessCodeId: string) {
  return `mytcflab:access-expiry-dismissed:${accessCodeId}`;
}

export function isAccessExpiryDismissed(storage: Pick<Storage, "getItem">, accessCodeId: string, todayKey: string): boolean {
  return storage.getItem(accessExpiryDismissalStorageKey(accessCodeId)) === todayKey;
}
