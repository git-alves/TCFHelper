import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DELETE_STATEMENT_TIMEOUT_MS = 6_000;
// Prisma's own interactive-transaction timeout defaults to 5s -- shorter
// than DELETE_STATEMENT_TIMEOUT_MS above -- so without an explicit override
// here, Prisma would abandon the transaction on its own clock before
// Postgres ever got a chance to enforce the statement deadline this whole
// mechanism exists for, surfacing an unhandled P2028 instead of the
// intended definite result. This must stay above
// DELETE_STATEMENT_TIMEOUT_MS (so Postgres's own cancellation is always
// what actually fires) and below the client's own abort deadline (so the
// client still gets a real response instead of timing out itself).
export const DELETE_TRANSACTION_TIMEOUT_MS = 8_000;

function isStatementTimeoutError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // 57014 is Postgres's own SQLSTATE for a canceled statement (what
    // DELETE_STATEMENT_TIMEOUT_MS is designed to trigger). P2028 is
    // Prisma's own interactive-transaction timeout/closure error -- a
    // defensive second case in the unlikely event Prisma's own timeout
    // above still fires first (e.g. under connection-pool contention),
    // which is just as much a "could not confirm in time" outcome as the
    // deliberate Postgres cancellation.
    if (typeof error.meta?.code === "string" && error.meta.code === "57014") return true;
    if (error.code === "P2028") return true;
    if (/statement timeout/i.test(error.message)) return true;
  }
  return error instanceof Error && /statement timeout/i.test(error.message);
}

/**
 * Runs `run` inside a transaction with a Postgres-enforced statement
 * deadline. Any error surfacing from that transaction -- the deliberate
 * cancellation this deadline exists to cause, or a genuine unrelated
 * database error -- means the mutation cannot be confirmed to have
 * committed, so both are folded into the same "not confirmed" result here
 * rather than trying to exhaustively pattern-match Postgres's exact
 * cancellation error shape (which Prisma does not document as a stable
 * contract). A caller that needs to distinguish infrastructure failures for
 * its own error handling should not reuse this helper.
 *
 * Shared by every admin destructive-delete path (access codes, support
 * requests, ...) so the same bounded, definite-outcome guarantee applies
 * everywhere rather than being reimplemented per feature.
 */
export async function withDeleteDeadline<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
  try {
    const value = await prisma.$transaction(
      async (tx) => {
        // Not user input -- DELETE_STATEMENT_TIMEOUT_MS is a fixed internal
        // constant, so this is safe without parameter binding (which SET
        // does not support in Postgres in any case).
        await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${DELETE_STATEMENT_TIMEOUT_MS}`);
        return run(tx);
      },
      { timeout: DELETE_TRANSACTION_TIMEOUT_MS },
    );
    return { timedOut: false, value };
  } catch (error) {
    if (isStatementTimeoutError(error)) return { timedOut: true };
    throw error;
  }
}
