import { z } from "zod";
import { InactivityEmailKind, Locale } from "@prisma/client";
import {
  adminJsonResponse,
  adminNotFoundResponse,
  getAdminApiUser,
} from "@/lib/admin-api";
import {
  getInactivityEmailDisplay,
  updateInactivityEmailSettings,
} from "@/lib/inactivity-emails";

const templateSchema = z
  .object({
    kind: z.nativeEnum(InactivityEmailKind),
    locale: z.nativeEnum(Locale),
    subject: z.string().max(300),
    body: z.string().max(10_000),
  })
  .strict();
const schema = z
  .object({
    enabled: z.boolean().optional(),
    templates: z.array(templateSchema).max(8).optional(),
  })
  .strict();

export async function GET() {
  if (!(await getAdminApiUser())) return adminNotFoundResponse();
  return adminJsonResponse(await getInactivityEmailDisplay());
}
export async function PUT(request: Request) {
  if (!(await getAdminApiUser())) return adminNotFoundResponse();
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return adminJsonResponse(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      400,
    );
  try {
    return adminJsonResponse(await updateInactivityEmailSettings(parsed.data));
  } catch (error) {
    return adminJsonResponse(
      {
        error:
          error instanceof Error ? error.message : "Could not save settings.",
      },
      400,
    );
  }
}
