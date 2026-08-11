import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ADMIN_ACCESS_CODES_PAGE_SIZE = 50;
// A generation request is an interactive owner action, not a bulk-import
// tool; this bounds an accidental extra zero rather than a real use case.
export const MAX_ACCESS_CODE_BATCH_SIZE = 100;
const MAX_NOTE_LENGTH = 280;
const CODE_GENERATION_ATTEMPTS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// Excludes 0/O and 1/I: a code is read aloud or retyped by a learner, and
// these are the pairs most often confused across fonts.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_GROUP_LENGTH = 4;
// 32 symbols × 16 independently generated characters = 2^80 possible
// values. Access codes are bearer credentials and redemption deliberately
// does not disclose availability, so this needs more than a short PIN's
// search space even before an operator adds perimeter rate limiting.
const CODE_GROUP_COUNT = 4;

export type AdminAccessCode = {
  id: string;
  code: string;
  note: string | null;
  createdAt: string;
  redeemedAt: string | null;
  redeemedByUserEmail: string | null;
  /** Null means lifetime access once redeemed. */
  validityDays: number | null;
  /**
   * Derived from redeemedAt + validityDays, not read from a stored column.
   * Present only once a timed code has actually been redeemed. Enforcement
   * itself happens lazily in hasRedeemedAccessCode, so a code can show as
   * expired here before the DB has caught up with that on the learner's own
   * next request -- this keeps the admin view honest in the meantime.
   */
  expiresAt: string | null;
};

function randomCodeGroup() {
  let group = "";
  for (let i = 0; i < CODE_GROUP_LENGTH; i += 1) {
    group += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return group;
}

/** Matches the human-readable shape shown on the /activate form. */
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
async function createOneAccessCode(note: string | null, validityDays: number | null): Promise<AdminAccessCode> {
  for (let attempt = 0; attempt < CODE_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const created = await prisma.accessCode.create({
        data: { code: generateCandidateCode(), note, validityDays },
        select: { id: true, code: true, note: true, createdAt: true, redeemedAt: true, validityDays: true },
      });
      return {
        id: created.id,
        code: created.code,
        note: created.note,
        createdAt: created.createdAt.toISOString(),
        redeemedAt: created.redeemedAt?.toISOString() ?? null,
        redeemedByUserEmail: null,
        validityDays: created.validityDays,
        expiresAt: null,
      };
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
    }
  }

  throw new AccessCodeGenerationFailedError();
}

/**
 * Generates one or more codes sharing the same note and validity period.
 * Each code is still an independently unique, single-use credential -- a
 * batch is only a generation-time convenience, not a shared/multi-use code.
 */
export async function createAccessCodes(
  note: string | null,
  validityDays: number | null,
  count: number,
): Promise<AdminAccessCode[]> {
  const trimmedNote = note?.trim().slice(0, MAX_NOTE_LENGTH) || null;
  const codes: AdminAccessCode[] = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(await createOneAccessCode(trimmedNote, validityDays));
  }
  return codes;
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
      validityDays: true,
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
    validityDays: code.validityDays,
    expiresAt:
      code.redeemedAt && code.validityDays !== null
        ? new Date(code.redeemedAt.getTime() + code.validityDays * MS_PER_DAY).toISOString()
        : null,
  }));
}
