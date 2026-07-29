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

export async function authorizeCredentials(rawCredentials: unknown) {
  const parsed = credentialsSchema.safeParse(rawCredentials);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return null;

  return { id: user.id, email: user.email, name: user.name };
}
