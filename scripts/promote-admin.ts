/**
 * Promotes exactly one already-provisioned local User to the MyTCFLab owner.
 * This is intentionally an operator-only bootstrap command: the web UI never
 * grants or transfers the owner capability.
 *
 * Usage: npm run admin:promote -- owner@example.com --apply
 */
import "dotenv/config";

import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const email = args.find((argument) => !argument.startsWith("-"))?.trim().toLowerCase();

async function main() {
  if (!email || args.filter((argument) => !argument.startsWith("-")).length !== 1) {
    throw new Error("Usage: npm run admin:promote -- owner@example.com --apply");
  }
  if (!apply) {
    throw new Error("Refusing to promote without --apply. Usage: npm run admin:promote -- owner@example.com --apply");
  }

  const prisma = new PrismaClient();
  try {
    const owner = await prisma.$transaction(async (tx) => {
      // Serialize this rare operator action and provide a clear application
      // error before the partial unique index supplies its database backstop.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"mytcflab-admin-owner"})::bigint)`;

      const existingOwner = await tx.user.findFirst({
        where: { isAdmin: true },
        select: { id: true, email: true },
      });
      if (existingOwner) {
        if (existingOwner.email.toLowerCase() === email) return existingOwner;
        throw new Error(
          `An owner already exists (${existingOwner.email}). Use a reviewed ownership-transfer procedure instead of creating a second owner.`,
        );
      }

      const target = await tx.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, email: true },
      });
      if (!target) {
        throw new Error(
          `No provisioned local account exists for ${email}. Have that person sign in and visit /activate once before promoting them.`,
        );
      }

      return tx.user.update({
        where: { id: target.id },
        data: { isAdmin: true },
        select: { id: true, email: true },
      });
    });

    console.log(`Owner access is active for ${owner.email} (${owner.id}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
