import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveExpiresAt } from "@/lib/access-code-expiry";
import { calendarDaysUntil, isAccessExpiryWarning, localCalendarDayKey } from "@/lib/access-code-expiry-warning";

export type AccessExpiryNotice = {
  accessCodeId: string;
  expiresAt: string;
  days: number;
  todayKey: string;
  timezone: string | null;
};

/** Reads only an attached, still-live code; admins and lifetime codes never warn. */
export async function getAccessExpiryNotice(user: { id: string; isAdmin: boolean; timezone: string | null }, now = new Date()): Promise<AccessExpiryNotice | null> {
  if (user.isAdmin) return null;
  const code = await prisma.accessCode.findUnique({
    where: { redeemedByUserId: user.id },
    select: { id: true, redeemedAt: true, validityDays: true, expiresAt: true },
  });
  if (!code) return null;
  const expiresAt = resolveExpiresAt(code);
  if (!expiresAt || expiresAt.getTime() <= now.getTime()) return null;
  const days = calendarDaysUntil(expiresAt, now, user.timezone);
  if (!isAccessExpiryWarning(days)) return null;
  return { accessCodeId: code.id, expiresAt: expiresAt.toISOString(), days, todayKey: localCalendarDayKey(now, user.timezone), timezone: user.timezone };
}
