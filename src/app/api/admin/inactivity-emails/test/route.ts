import { z } from "zod";
import { InactivityEmailKind, Locale } from "@prisma/client";
import { adminJsonResponse, adminNotFoundResponse, getAdminApiUser } from "@/lib/admin-api";
import { sendInactivityEmailTest } from "@/lib/inactivity-emails";

const schema = z.object({ kind: z.nativeEnum(InactivityEmailKind), locale: z.nativeEnum(Locale), subject: z.string().max(300), body: z.string().max(10_000) }).strict();
export async function POST(request: Request) {
  const admin = await getAdminApiUser(); if (!admin) return adminNotFoundResponse();
  const parsed = schema.safeParse(await request.json().catch(() => ({}))); if (!parsed.success) return adminJsonResponse({ error: "Invalid test email." }, 400);
  try { await sendInactivityEmailTest({ ...parsed.data, to: admin.email }); return adminJsonResponse({ sent: true }); }
  catch (error) { return adminJsonResponse({ error: error instanceof Error ? error.message : "Could not send test." }, 400); }
}
