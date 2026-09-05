import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { transactionMock, deleteManyMock, executeRawUnsafeMock } = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  deleteManyMock: vi.fn(),
  executeRawUnsafeMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: transactionMock },
}));

const { deleteSupportRequest } = await import("./admin-support");

function statementTimeoutError() {
  return new Prisma.PrismaClientKnownRequestError("canceling statement due to statement timeout", {
    code: "P2010",
    clientVersion: "test",
    meta: { code: "57014" },
  });
}

beforeEach(() => {
  transactionMock.mockReset();
  deleteManyMock.mockReset();
  executeRawUnsafeMock.mockReset();
  executeRawUnsafeMock.mockResolvedValue(undefined);
  transactionMock.mockImplementation(async (callback) =>
    callback({
      supportRequest: { deleteMany: deleteManyMock },
      $executeRawUnsafe: executeRawUnsafeMock,
    }),
  );
});

describe("deleteSupportRequest", () => {
  it("deletes an existing request", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await expect(deleteSupportRequest("request_1")).resolves.toEqual({ kind: "deleted" });
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { id: "request_1" } });
  });

  it("reports an unknown request as not found", async () => {
    deleteManyMock.mockResolvedValue({ count: 0 });

    await expect(deleteSupportRequest("missing")).resolves.toEqual({ kind: "notFound" });
  });

  it("runs the delete under a Postgres statement deadline", async () => {
    deleteManyMock.mockResolvedValue({ count: 1 });

    await deleteSupportRequest("request_1");

    expect(executeRawUnsafeMock).toHaveBeenCalledWith(expect.stringContaining("SET LOCAL statement_timeout"));
  });

  it("reports a definite timedOut, not a false notFound, when the database cancels a blocked statement", async () => {
    transactionMock.mockRejectedValue(statementTimeoutError());

    await expect(deleteSupportRequest("request_1")).resolves.toEqual({ kind: "timedOut" });
  });

  it("re-throws a database error unrelated to the statement deadline", async () => {
    transactionMock.mockRejectedValue(new Error("connection terminated unexpectedly"));

    await expect(deleteSupportRequest("request_1")).rejects.toThrow("connection terminated unexpectedly");
  });
});
