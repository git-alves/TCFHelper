import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { createMock, findManyMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    accessCode: { create: createMock, findMany: findManyMock },
  },
}));

const { createAccessCode, listAccessCodes, AccessCodeGenerationFailedError } = await import(
  "./admin-access-codes"
);

function uniqueConstraintError() {
  return new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
    code: "P2002",
    clientVersion: "test",
  });
}

beforeEach(() => {
  createMock.mockReset();
  findManyMock.mockReset();
});

describe("createAccessCode", () => {
  it("creates an 80-bit TCF-XXXX-XXXX-XXXX-XXXX code with a trimmed note", async () => {
    createMock.mockResolvedValue({
      id: "code_1",
      code: "TCF-AB12-CD34",
      note: "for beta cohort",
      createdAt: new Date("2026-08-10T00:00:00.000Z"),
      redeemedAt: null,
    });

    const result = await createAccessCode("  for beta cohort  ");

    expect(result).toEqual({
      id: "code_1",
      code: "TCF-AB12-CD34",
      note: "for beta cohort",
      createdAt: "2026-08-10T00:00:00.000Z",
      redeemedAt: null,
      redeemedByUserEmail: null,
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    const createdData = createMock.mock.calls[0][0].data;
    expect(createdData.code).toMatch(/^TCF-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("stores a null note when none is given", async () => {
    createMock.mockResolvedValue({
      id: "code_1",
      code: "TCF-AB12-CD34",
      note: null,
      createdAt: new Date(),
      redeemedAt: null,
    });

    await createAccessCode(null);

    expect(createMock.mock.calls[0][0].data.note).toBeNull();
  });

  it("retries on a code collision instead of surfacing the constraint error", async () => {
    createMock
      .mockRejectedValueOnce(uniqueConstraintError())
      .mockRejectedValueOnce(uniqueConstraintError())
      .mockResolvedValueOnce({
        id: "code_3",
        code: "TCF-EF56-GH78",
        note: null,
        createdAt: new Date(),
        redeemedAt: null,
      });

    const result = await createAccessCode(null);

    expect(result.code).toBe("TCF-EF56-GH78");
    expect(createMock).toHaveBeenCalledTimes(3);
  });

  it("gives up after repeated collisions instead of looping forever", async () => {
    createMock.mockRejectedValue(uniqueConstraintError());

    await expect(createAccessCode(null)).rejects.toBeInstanceOf(AccessCodeGenerationFailedError);
  });

  it("does not retry a non-collision error", async () => {
    const dbError = new Error("connection lost");
    createMock.mockRejectedValue(dbError);

    await expect(createAccessCode(null)).rejects.toBe(dbError);
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});

describe("listAccessCodes", () => {
  it("serializes codes with their redeemer's email", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "code_1",
        code: "TCF-AB12-CD34",
        note: "batch 1",
        createdAt: new Date("2026-08-10T00:00:00.000Z"),
        redeemedAt: new Date("2026-08-11T00:00:00.000Z"),
        redeemedByUser: { email: "learner@example.com" },
      },
      {
        id: "code_2",
        code: "TCF-EF56-GH78",
        note: null,
        createdAt: new Date("2026-08-09T00:00:00.000Z"),
        redeemedAt: null,
        redeemedByUser: null,
      },
    ]);

    const codes = await listAccessCodes();

    expect(codes).toEqual([
      {
        id: "code_1",
        code: "TCF-AB12-CD34",
        note: "batch 1",
        createdAt: "2026-08-10T00:00:00.000Z",
        redeemedAt: "2026-08-11T00:00:00.000Z",
        redeemedByUserEmail: "learner@example.com",
      },
      {
        id: "code_2",
        code: "TCF-EF56-GH78",
        note: null,
        createdAt: "2026-08-09T00:00:00.000Z",
        redeemedAt: null,
        redeemedByUserEmail: null,
      },
    ]);
  });
});
