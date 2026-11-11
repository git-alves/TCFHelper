import { beforeEach, describe, expect, it, vi } from "vitest";

const { userFindUniqueMock, userUpdateMock, requestCountMock, getPendingSupportNoticeMock } = vi.hoisted(() => ({
  userFindUniqueMock: vi.fn(),
  userUpdateMock: vi.fn(),
  requestCountMock: vi.fn(),
  getPendingSupportNoticeMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUniqueMock, update: userUpdateMock },
    supportRequest: { count: requestCountMock },
  },
}));
vi.mock("@/lib/support-resolution", () => ({ getPendingSupportNotice: getPendingSupportNoticeMock }));

const {
  classifyNewTicket,
  getNavSupportState,
  getSupportInboxCount,
  markSupportInboxSeen,
  supportInboxNewWhere,
} = await import("./support-inbox");

const SEEN = new Date("2026-11-10T12:00:00.000Z");
const BEFORE = new Date("2026-11-09T12:00:00.000Z");
const AFTER = new Date("2026-11-11T12:00:00.000Z");

function ticket(overrides: Partial<Parameters<typeof classifyNewTicket>[0]> = {}) {
  return {
    status: "OPEN" as const,
    createdAt: BEFORE,
    resolutionFeedback: null,
    feedbackAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  userFindUniqueMock.mockReset();
  userUpdateMock.mockReset();
  requestCountMock.mockReset();
  getPendingSupportNoticeMock.mockReset();
});

describe("classifyNewTicket", () => {
  it("an open ticket created after the last visit is new", () => {
    expect(classifyNewTicket(ticket({ createdAt: AFTER }), SEEN)).toBe("new");
  });

  it("an open ticket the learner reopened after the last visit is reopened", () => {
    expect(
      classifyNewTicket(ticket({ resolutionFeedback: "STILL_BROKEN", feedbackAt: AFTER }), SEEN),
    ).toBe("reopened");
  });

  it("a ticket created after the last visit stays new even if it was also reopened", () => {
    expect(
      classifyNewTicket(ticket({ createdAt: AFTER, resolutionFeedback: "STILL_BROKEN", feedbackAt: AFTER }), SEEN),
    ).toBe("new");
  });

  it("a resolved ticket is never new, however recent", () => {
    expect(classifyNewTicket(ticket({ status: "RESOLVED", createdAt: AFTER }), SEEN)).toBeNull();
    expect(
      classifyNewTicket(ticket({ status: "RESOLVED", resolutionFeedback: "WORKED", feedbackAt: AFTER }), SEEN),
    ).toBeNull();
  });

  it("a ticket reopened before the last visit was already seen", () => {
    expect(
      classifyNewTicket(ticket({ resolutionFeedback: "STILL_BROKEN", feedbackAt: BEFORE }), SEEN),
    ).toBeNull();
  });

  it("a ticket from before the last visit with no later feedback is not new", () => {
    expect(classifyNewTicket(ticket(), SEEN)).toBeNull();
  });

  it("with no recorded visit every open ticket is new, and a reopened one says so", () => {
    expect(classifyNewTicket(ticket(), null)).toBe("new");
    expect(classifyNewTicket(ticket({ resolutionFeedback: "STILL_BROKEN", feedbackAt: BEFORE }), null)).toBe("reopened");
    expect(classifyNewTicket(ticket({ status: "RESOLVED" }), null)).toBeNull();
  });

  it("answering WORKED does not make an open ticket reopened", () => {
    expect(classifyNewTicket(ticket({ resolutionFeedback: "WORKED", feedbackAt: AFTER }), SEEN)).toBeNull();
  });
});

describe("supportInboxNewWhere", () => {
  it("counts only open tickets created or reopened after the last visit", () => {
    expect(supportInboxNewWhere(SEEN)).toEqual({
      status: "OPEN",
      OR: [{ createdAt: { gt: SEEN } }, { resolutionFeedback: "STILL_BROKEN", feedbackAt: { gt: SEEN } }],
    });
  });

  it("with no recorded visit counts every open ticket", () => {
    expect(supportInboxNewWhere(null)).toEqual({ status: "OPEN" });
  });
});

describe("getSupportInboxCount", () => {
  it("reads the admin's last visit, then counts with the matching filter", async () => {
    userFindUniqueMock.mockResolvedValue({ supportInboxSeenAt: SEEN });
    requestCountMock.mockResolvedValue(3);

    await expect(getSupportInboxCount("admin_1")).resolves.toBe(3);

    expect(userFindUniqueMock).toHaveBeenCalledWith({ where: { id: "admin_1" }, select: { supportInboxSeenAt: true } });
    expect(requestCountMock).toHaveBeenCalledWith({ where: supportInboxNewWhere(SEEN) });
  });

  it("treats a never-opened inbox as every open ticket being new", async () => {
    userFindUniqueMock.mockResolvedValue({ supportInboxSeenAt: null });
    requestCountMock.mockResolvedValue(5);

    await expect(getSupportInboxCount("admin_1")).resolves.toBe(5);
    expect(requestCountMock).toHaveBeenCalledWith({ where: { status: "OPEN" } });
  });
});

describe("markSupportInboxSeen", () => {
  it("records the moment the visit began", async () => {
    await markSupportInboxSeen("admin_1", SEEN);

    expect(userUpdateMock).toHaveBeenCalledWith({ where: { id: "admin_1" }, data: { supportInboxSeenAt: SEEN } });
  });
});

describe("getNavSupportState (what the root layout hands the nav)", () => {
  const NOTICE = { id: "req_1", ticketNumber: 4, resolutionNote: null, resolvedAt: "2026-11-12T10:00:00.000Z" };

  it("gives an admin both the learner notice and the new-ticket count", async () => {
    getPendingSupportNoticeMock.mockResolvedValue(NOTICE);
    userFindUniqueMock.mockResolvedValue({ supportInboxSeenAt: SEEN });
    requestCountMock.mockResolvedValue(2);

    await expect(getNavSupportState({ id: "admin_1", isAdmin: true })).resolves.toEqual({
      supportNotice: NOTICE,
      adminSupportCount: 2,
    });
  });

  it("never runs the count query for a learner, and gives no count", async () => {
    getPendingSupportNoticeMock.mockResolvedValue(NOTICE);

    await expect(getNavSupportState({ id: "learner_1", isAdmin: false })).resolves.toEqual({
      supportNotice: NOTICE,
      adminSupportCount: null,
    });

    expect(userFindUniqueMock).not.toHaveBeenCalled();
    expect(requestCountMock).not.toHaveBeenCalled();
  });

  it("runs nothing for a signed-out visitor", async () => {
    await expect(getNavSupportState(null)).resolves.toEqual({ supportNotice: null, adminSupportCount: null });

    expect(getPendingSupportNoticeMock).not.toHaveBeenCalled();
    expect(requestCountMock).not.toHaveBeenCalled();
  });

  it("a failing count leaves no badge (null) without failing the page, and keeps the notice", async () => {
    getPendingSupportNoticeMock.mockResolvedValue(NOTICE);
    userFindUniqueMock.mockRejectedValue(new Error("db down"));

    await expect(getNavSupportState({ id: "admin_1", isAdmin: true })).resolves.toEqual({
      supportNotice: NOTICE,
      adminSupportCount: null,
    });
  });

  it("a failing notice lookup leaves no dot but keeps the admin count", async () => {
    getPendingSupportNoticeMock.mockRejectedValue(new Error("db down"));
    userFindUniqueMock.mockResolvedValue({ supportInboxSeenAt: null });
    requestCountMock.mockResolvedValue(1);

    await expect(getNavSupportState({ id: "admin_1", isAdmin: true })).resolves.toEqual({
      supportNotice: null,
      adminSupportCount: 1,
    });
  });
});
