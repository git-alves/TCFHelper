import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { passwordSchema } from "@/lib/validation";

const signupSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  name: z.string().min(1).max(100).optional(),
});

const EMAIL_IN_USE_RESPONSE = NextResponse.json(
  { error: "An account with this email already exists." },
  { status: 409 }
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a valid email and a password of at least 8 characters." },
      { status: 400 }
    );
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return EMAIL_IN_USE_RESPONSE.clone();
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    // Two concurrent signups for the same email can both pass the
    // findUnique check above; the loser hits the DB's unique constraint.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return EMAIL_IN_USE_RESPONSE.clone();
    }
    throw error;
  }
}
