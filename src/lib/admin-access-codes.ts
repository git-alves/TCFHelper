import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ADMIN_ACCESS_CODES_PAGE_SIZE = 50;
const MAX_NOTE_LENGTH = 280;
const CODE_GENERATION_ATTEMPTS = 5;
// Excludes 0/O and 1/I: a code is read aloud or retyped by a learner, and
// these are the pairs most often confused across fonts.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_GROUP_LENGTH = 4;
const CODE_GROUP_COUNT = 2;

export type AdminAccessCode = {
  id: string;
  code: string;
  note: string | null;
  createdAt: string;
  redeemedAt: string | null;
  redeemedByUserEmail: string | null;
};

function randomCodeGroup() {
  let group = "";
  for (let i = 0; i < CODE_GROUP_LENGTH; i += 1) {
    group += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return group;
}

/** Matches the "TCF-AB12-CD34" shape already shown on the /activate form. */
function generateCandidateCode() {
  const groups = Array.from({ length: CODE_GROUP_COUNT }, randomCodeGroup);
  return ["TCF", ...groups].join("-");
}

function isUniqueConstraint(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export class AccessCodeGenerationFailedError extends Error {
  constructor() {
    super("Could not generate a unique access code.");
    this.name = "AccessCodeGenerationFailedError";
  }
}

/**
 * Retries on a random-code collision (astronomically unlikely at this
 * alphabet/length, but a single-use credential must never silently reuse
 * another code's identity) rather than letting a unique-constraint error
 * surface as a generic 500.
 */
export async function createAccessCode(note: string | null): Promise<AdminAccessCode> {
  const trimmedNote = note?.trim().slice(0, MAX_NOTE_LENGTH) || null;

  for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const created = await prisma.accessCode.create({
        data: { code: generateCandidateCode(), note: trimmedNote },
        select: { id: true, code: true, note: true, createdAt: true, redeemedAt: true },
      });
      return {
        id: created.id,
        code: created.code,
        note: created.note,
        createdAt: created.createdAt.toISOString(),
        redeemedAt: created.redeemedAt?.toISOString() ?? null,
        redeemedByUserEmail: null,
      };
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
    }
  }

  throw new AccessCodeGenerationFailedError();
}

export async function listAccessCodes(): Promise<AdminAccessCode[]> {
  const codes = await prisma.accessCode.findMany({
    orderBy: { createdAt: "desc" },
    take: ADMIN_ACCESS_CODES_PAGE_SIZE,
    select: {
      id: true,
      code: true,
      note: true,
      createdAt: true,
      redeemedAt: true,
      redeemedByUser: { select: { email: true } },
    },
  });

  return codes.map((code) => ({
    id: code.id,
    code: code.code,
    note: code.note,
    createdAt: code.createdAt.toISOString(),
    redeemedAt: code.redeemedAt?.toISOString() ?? null,
    redeemedByUserEmail: code.redeemedByUser?.email ?? null,
  }));
}
