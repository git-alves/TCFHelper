import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { transactionMock, executeRawUnsafeMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  executeRawUnsafeMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));

const { withDeleteDeadline, DELETE_STATEMENT_TIMEOUT_MS, DELETE_TRANSACTION_TIMEOUT_MS } = await import(
  "./admin-delete-deadline"
);

function statementTimeoutError() {
  return new Prisma.PrismaClientKnownRequestError("canceling statement due to statement timeout", {
    code: "P2010",
    clientVersion: "test",
    meta: { code: "57014" },
  });
}

function prismaTransactionTimeoutError() {
  return new Prisma.PrismaClientKnownRequestError("Transaction already closed", {
    code: "P2028",
    clientVersion: "test",
  });
}

beforeEach(() => {
  transactionMock.mockReset();
  executeRawUnsafeMock.mockReset();
  executeRawUnsafeMock.mockResolvedValue(undefined);
  transactionMock.mockImplementation(async (callback) => callback({ $executeRawUnsafe: executeRawUnsafeMock }));
});

describe("withDeleteDeadline", () => {
  it("runs the callback under a Postgres statement deadline, with Prisma's own transaction timeout set above it", async () => {
    await withDeleteDeadline(async () => "done");

    expect(executeRawUnsafeMock).toHaveBeenCalledWith(
      `SET LOCAL statement_timeout = ${DELETE_STATEMENT_TIMEOUT_MS}`,
    );
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), { timeout: DELETE_TRANSACTION_TIMEOUT_MS });
  });

  it("resolves the callback's own value on success", async () => {
    await expect(withDeleteDeadline(async () => ({ count: 1 }))).resolves.toEqual({
      timedOut: false,
      value: { count: 1 },
    });
  });

  it("reports a definite timedOut when the database cancels a blocked statement", async () => {
    transactionMock.mockRejectedValue(statementTimeoutError());

    await expect(withDeleteDeadline(async () => "unreached")).resolves.toEqual({ timedOut: true });
  });

  it("reports a definite timedOut when Prisma's own transaction timeout fires first", async () => {
    transactionMock.mockRejectedValue(prismaTransactionTimeoutError());

    await expect(withDeleteDeadline(async () => "unreached")).resolves.toEqual({ timedOut: true });
  });

  it("re-throws a database error unrelated to the statement deadline instead of misreporting it as a timeout", async () => {
    transactionMock.mockRejectedValue(new Error("connection terminated unexpectedly"));

    await expect(withDeleteDeadline(async () => "unreached")).rejects.toThrow("connection terminated unexpectedly");
  });
});
