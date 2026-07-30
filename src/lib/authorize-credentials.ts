import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { loginPasswordSchema } from "@/lib/validation";

// Deliberately not the signup-time `passwordSchema` — see
// `loginPasswordSchema` for why login can't safely impose the same bound.
const credentialsSchema = z.object({
  email: z.string().email(),
  password: loginPasswordSchema,
});

// A fixed bcrypt hash (cost 12, matching the signup route) of an
// arbitrary password nobody will type. Used only so `bcrypt.compare`
// always runs, and takes comparable time, whether or not the email
// matches an account — otherwise returning early for an unknown email
// makes login response time a timing oracle for account enumeration.
const DUMMY_PASSWORD_HASH = "$2b$12$8HMybdgig6pGHYsjVvKvC.vIF2Vz2OWScjcggsO.bhXZ77s.OauQK";

export async function authorizeCredentials(rawCredentials: unknown) {
  const parsed = credentialsSchema.safeParse(rawCredentials);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const isValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !isValid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
