import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ADMIN_ACCESS_CODES_PAGE_SIZE } from "@/lib/access-code-limits";

const MAX_NOTE_LENGTH = 280;
const MAX_ACCESS_CODES_SEARCH_LENGTH = 120;
const ACCESS_CODE_LIST_SELECT = {
  id: true,
  code: true,
  note: true,
  createdAt: true,
  redeemedAt: true,
  validityDays: true,
  redeemedByUser: { select: { email: true } },
} satisfies Prisma.AccessCodeSelect;
// Retries the *whole* batch transaction, not one statement inside it: a
// unique-constraint violation marks a PostgreSQL interactive transaction
// aborted, so every later statement in that same transaction (even a
// well-formed retry with a fresh candidate code) would fail too. Collisions
// are astronomically unlikely at this alphabet/length, so re-running the
// entire batch with fresh candidates is effectively free in the common
// (zero-collision) case rather than a real cost paid often.
const BATCH_GENERATION_ATTEMPTS = 5;
// Sized for a full-size batch of sequential inserts, not a single one --
// createAccessCodes wraps the whole batch in one transaction so a failure
// partway through never leaves an earlier code in the batch persisted but
// undisclosed to the owner.
const BATCH_TRANSACTION_TIMEOUT_MS = 15_000;
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

type AccessCodeCreator = Pick<Prisma.TransactionClient["accessCode"], "create">;

/** A single insert attempt with one candidate code -- no retry of its own. */
async function insertOneAccessCode(
  db: AccessCodeCreator,
  note: string | null,
  validityDays: number | null,
): Promise<AdminAccessCode> {
  const created = await db.create({
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
}

/**
 * Generates one or more codes sharing the same note and validity period.
 * Each code is still an independently unique, single-use credential -- a
 * batch is only a generation-time convenience, not a shared/multi-use code.
 * The whole batch runs in one transaction: a failure partway through rolls
 * the entire batch back instead of leaving an undisclosed prefix of valid
 * bearer codes persisted. A collision retries that whole transaction with
 * fresh candidates, not just the one colliding insert -- see
 * BATCH_GENERATION_ATTEMPTS for why a single aborted-transaction-safe retry
 * loop inside the transaction cannot work.
 */
export async function createAccessCodes(
  note: string | null,
  validityDays: number | null,
  count: number,
): Promise<AdminAccessCode[]> {
  const trimmedNote = note?.trim().slice(0, MAX_NOTE_LENGTH) || null;

  for (let attempt = 0; attempt < BATCH_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const codes: AdminAccessCode[] = [];
          for (let i = 0; i < count; i += 1) {
            codes.push(await insertOneAccessCode(tx.accessCode, trimmedNote, validityDays));
          }
          return codes;
        },
        { timeout: BATCH_TRANSACTION_TIMEOUT_MS },
      );
    } catch (error) {
      if (!isUniqueConstraint(error)) throw error;
    }
  }

  throw new AccessCodeGenerationFailedError();
}

export type DeleteAccessCodeResult =
  | { kind: "deleted" }
  | { kind: "notFound" }
  | { kind: "activelyRedeemed" };

/**
 * Permanently removes a code that has no live admission -- either never
 * redeemed, or already detached (a manual "Deactivate access" or an elapsed
 * timed code's window). A code currently granting access is never deleted:
 * hasRedeemedAccessCode resolves a learner's admission through this exact
 * row, so deleting it out from under an active redemption would sever their
 * access. Use "Deactivate access" on the learner's detail page first if the
 * goal is to revoke them; the code becomes deletable once detached.
 */
export async function deleteAccessCode(id: string): Promise<DeleteAccessCodeResult> {
  const deleted = await prisma.accessCode.deleteMany({
    where: { id, redeemedByUserId: null },
  });
  if (deleted.count === 1) return { kind: "deleted" };

  const stillExists = await prisma.accessCode.findUnique({ where: { id }, select: { id: true } });
  return stillExists ? { kind: "activelyRedeemed" } : { kind: "notFound" };
}

function serializeAccessCode(code: Prisma.AccessCodeGetPayload<{ select: typeof ACCESS_CODE_LIST_SELECT }>): AdminAccessCode {
  return {
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
  };
}

export function parseAdminAccessCodesListQuery(input: { query?: string | string[]; page?: string | string[] }) {
  const rawQuery = typeof input.query === "string" ? input.query : "";
  const query = rawQuery.trim().slice(0, MAX_ACCESS_CODES_SEARCH_LENGTH);
  const rawPage = typeof input.page === "string" ? Number(input.page) : 1;
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  return { query, page };
}

function accessCodeSearchWhere(query: string): Prisma.AccessCodeWhereInput {
  if (!query) return {};

  return {
    OR: [
      { code: { contains: query, mode: "insensitive" } },
      { note: { contains: query, mode: "insensitive" } },
      { redeemedByUser: { email: { contains: query, mode: "insensitive" } } },
    ],
  };
}

/**
 * A "long list of codes" (the exact scenario the delete control was built
 * for) needs a way to reach codes past the first page, not just the newest
 * ADMIN_ACCESS_CODES_PAGE_SIZE -- otherwise an older unused code has no path
 * to deletion at all once enough newer codes exist. Mirrors
 * getAdminUsersPage's count/clamp/skip/take shape.
 */
export async function getAdminAccessCodesPage({ query, page }: { query: string; page: number }) {
  const where = accessCodeSearchWhere(query);
  const total = await prisma.accessCode.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / ADMIN_ACCESS_CODES_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const records = await prisma.accessCode.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * ADMIN_ACCESS_CODES_PAGE_SIZE,
    take: ADMIN_ACCESS_CODES_PAGE_SIZE,
    select: ACCESS_CODE_LIST_SELECT,
  });

  return {
    accessCodes: records.map(serializeAccessCode),
    total,
    page: currentPage,
    pageCount,
    query,
  };
}
