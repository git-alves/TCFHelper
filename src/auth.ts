import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Deliberately not the signup-time `passwordSchema`: accounts created
// before that check existed may have a >72-byte password that bcrypt
// already truncated when hashing, and still authenticate correctly
// against that hash. Rejecting them here would lock those users out even
// though bcrypt.compare would succeed. The upper bound is only there to
// cap input size handed to bcrypt.compare — it's far above the 72-byte
// truncation point, so it never rejects a password bcrypt would accept.
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(512),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
