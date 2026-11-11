import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, findUniqueMock, updateManyMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findUniqueMock: vi.fn(),
  updateManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { supportRequest: { findFirst: findFirstMock, findUnique: findUniqueMock, updateMany: updateManyMock } },
}));

const {
  answerSupportNotice,
  dismissSupportNotice,
  getPendingSupportNotice,
  markSupportNoticeSeen,
  resolveSupportRequest,
} = await import("./support-resolution");

const NOW = new Date("2026-11-12T10:00:00.000Z");
// Seven days before NOW: a notice older than this has expired.
const EXPIRY_CUTOFF = new Date("2026-11-05T10:00:00.000Z");
const PENDING_WHERE = {
  userId: "learner_1",
  status: "RESOLVED",
  noticeDismissedAt: null,
  resolvedAt: { gt: EXPIRY_CUTOFF },
};

beforeEach(() => {
  findFirstMock.mockReset();
  findUniqueMock.mockReset();
  updateManyMock.mockReset();
});

describe("getPendingSupportNotice", () => {
  it("reads only the resolved, undismissed ticket of this learner, oldest resolution first, with just the notice fields", async () => {
    findFirstMock.mockResolvedValue({
      id: "req_1",
      ticketNumber: 7,
      resolutionNote: "Fixed the editor.",
      resolvedAt: new Date("2026-11-10T09:00:00.000Z"),
    });

    await expect(getPendingSupportNotice("learner_1", NOW)).resolves.toEqual({
      id: "req_1",
      ticketNumber: 7,
      resolutionNote: "Fixed the editor.",
      resolvedAt: "2026-11-10T09:00:00.000Z",
    });

    expect(findFirstMock).toHaveBeenCalledWith({
      where: PENDING_WHERE,
      orderBy: [{ resolvedAt: "asc" }, { ticketNumber: "asc" }],
      // Never the request's details or its attachment.
      select: { id: true, ticketNumber: true, resolutionNote: true, resolvedAt: true },
    });
  });

  it("is null when nothing is pending", async () => {
    findFirstMock.mockResolvedValue(null);
    await expect(getPendingSupportNotice("learner_1", NOW)).resolves.toBeNull();
  });

  it("ignores a malformed resolved row that has no resolvedAt", async () => {
    findFirstMock.mockResolvedValue({ id: "req_1", ticketNumber: 7, resolutionNote: null, resolvedAt: null });
    await expect(getPendingSupportNotice("learner_1", NOW)).resolves.toBeNull();
  });
});

describe("the 7-day expiry of a pending notice", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const noticeRow = (resolvedAt: Date) => ({ id: "req_1", ticketNumber: 7, resolutionNote: null, resolvedAt });

  it("asks only for notices resolved within the last 7 days, so the partial index's resolvedAt column bounds the scan", async () => {
    findFirstMock.mockResolvedValue(null);

    await getPendingSupportNotice("learner_1", NOW);

    expect(findFirstMock.mock.calls[0][0].where).toEqual(PENDING_WHERE);
    expect(findFirstMock.mock.calls[0][0].where.resolvedAt).toEqual({ gt: new Date(NOW.getTime() - 7 * DAY) });
  });

  it("6 days 23 hours ago is still pending; exactly 7 days and older is not", async () => {
    // The query is the filter: replay it as the database would apply it.
    const isPending = (resolvedAt: Date) => resolvedAt.getTime() > PENDING_WHERE.resolvedAt.gt.getTime();

    expect(isPending(new Date(NOW.getTime() - (6 * DAY + 23 * 60 * 60 * 1000)))).toBe(true);
    expect(isPending(new Date(NOW.getTime() - 7 * DAY))).toBe(false);
    expect(isPending(new Date(NOW.getTime() - (7 * DAY + 60 * 1000)))).toBe(false);
    expect(isPending(new Date(NOW.getTime() - 8 * DAY))).toBe(false);
  });

  it("moves with the clock it is given, not a fixed date", async () => {
    findFirstMock.mockResolvedValue(noticeRow(new Date("2026-11-20T00:00:00.000Z")));

    await getPendingSupportNotice("learner_1", new Date("2026-11-26T00:00:00.000Z"));

    expect(findFirstMock.mock.calls[0][0].where.resolvedAt).toEqual({ gt: new Date("2026-11-19T00:00:00.000Z") });
  });

  it("an expired notice can no longer be answered, declined or marked seen: it is notPending", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValue({ id: "req_1" });

    await expect(answerSupportNotice("learner_1", "req_1", "WORKED", NOW)).resolves.toEqual({ kind: "notPending" });
    await expect(dismissSupportNotice("learner_1", "req_1", NOW)).resolves.toEqual({ kind: "notPending" });
    for (const [call] of updateManyMock.mock.calls) expect(call.where.resolvedAt).toEqual({ gt: EXPIRY_CUTOFF });
  });
});

describe("resolveSupportRequest", () => {
  it("resolves only an OPEN request and starts a fresh notice cycle", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findUniqueMock.mockResolvedValue({ ticketNumber: 12 });

    await expect(resolveSupportRequest("req_1", "Try again now.", NOW)).resolves.toEqual({
      kind: "resolved",
      ticketNumber: 12,
    });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: "req_1", status: "OPEN" },
      data: {
        status: "RESOLVED",
        resolvedAt: NOW,
        resolutionNote: "Try again now.",
        // Resolving again after STILL_BROKEN is a new notice with no answer yet.
        noticeSeenAt: null,
        noticeDismissedAt: null,
        resolutionFeedback: null,
        feedbackAt: null,
      },
    });
  });

  it("reports an already-resolved request and a missing one differently", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    findUniqueMock.mockResolvedValueOnce({ id: "req_1" });
    await expect(resolveSupportRequest("req_1", null)).resolves.toEqual({ kind: "alreadyResolved" });

    findUniqueMock.mockResolvedValueOnce(null);
    await expect(resolveSupportRequest("missing", null)).resolves.toEqual({ kind: "notFound" });
  });
});

describe("answerSupportNotice", () => {
  it("WORKED records the answer and dismisses the notice, leaving the ticket RESOLVED", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findFirstMock.mockResolvedValue(null);

    await expect(answerSupportNotice("learner_1", "req_1", "WORKED", NOW)).resolves.toEqual({ kind: "ok", next: null });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { ...PENDING_WHERE, id: "req_1" },
      data: { resolutionFeedback: "WORKED", feedbackAt: NOW, noticeDismissedAt: NOW },
    });
  });

  it("STILL_BROKEN also puts the ticket back to OPEN, keeping the earlier resolution", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findFirstMock.mockResolvedValue(null);

    await answerSupportNotice("learner_1", "req_1", "STILL_BROKEN", NOW);

    const { data } = updateManyMock.mock.calls[0][0];
    expect(data).toEqual({
      resolutionFeedback: "STILL_BROKEN",
      feedbackAt: NOW,
      noticeDismissedAt: NOW,
      status: "OPEN",
    });
    // resolvedAt and resolutionNote are not touched, so the admin still sees them.
    expect(data).not.toHaveProperty("resolvedAt");
    expect(data).not.toHaveProperty("resolutionNote");
  });

  it("returns the learner's next pending notice so a second ticket needs no extra request", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findFirstMock.mockResolvedValue({
      id: "req_2",
      ticketNumber: 9,
      resolutionNote: null,
      resolvedAt: new Date("2026-11-11T09:00:00.000Z"),
    });

    await expect(answerSupportNotice("learner_1", "req_1", "WORKED", NOW)).resolves.toEqual({
      kind: "ok",
      next: { id: "req_2", ticketNumber: 9, resolutionNote: null, resolvedAt: "2026-11-11T09:00:00.000Z" },
    });
  });

  it("never overwrites an answer: a ticket that is not pending is notPending, someone else's is notFound", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValueOnce({ id: "req_1" });
    await expect(answerSupportNotice("learner_1", "req_1", "WORKED", NOW)).resolves.toEqual({ kind: "notPending" });
    expect(findFirstMock).toHaveBeenLastCalledWith({ where: { id: "req_1", userId: "learner_1" }, select: { id: true } });

    findFirstMock.mockResolvedValueOnce(null);
    await expect(answerSupportNotice("learner_1", "other_users", "WORKED", NOW)).resolves.toEqual({ kind: "notFound" });
  });
});

describe("dismissSupportNotice (\"I don't want to answer\")", () => {
  it("only sets noticeDismissedAt: the ticket stays resolved and no feedback is recorded", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });
    findFirstMock.mockResolvedValue(null);

    await expect(dismissSupportNotice("learner_1", "req_1", NOW)).resolves.toEqual({ kind: "ok", next: null });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { ...PENDING_WHERE, id: "req_1" },
      data: { noticeDismissedAt: NOW },
    });
  });

  it("a notice that is already dismissed (or not resolved) is notPending; another learner's ticket is notFound", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValueOnce({ id: "req_1" });
    await expect(dismissSupportNotice("learner_1", "req_1", NOW)).resolves.toEqual({ kind: "notPending" });

    findFirstMock.mockResolvedValueOnce(null);
    await expect(dismissSupportNotice("learner_1", "other_users", NOW)).resolves.toEqual({ kind: "notFound" });
  });
});

describe("markSupportNoticeSeen", () => {
  it("records the first view", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(markSupportNoticeSeen("learner_1", "req_1", NOW)).resolves.toEqual({ kind: "ok", next: null });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: { ...PENDING_WHERE, id: "req_1", noticeSeenAt: null },
      data: { noticeSeenAt: NOW },
    });
  });

  it("is idempotent for a notice that was already seen, and notFound for someone else's ticket", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValueOnce({ id: "req_1" });
    await expect(markSupportNoticeSeen("learner_1", "req_1", NOW)).resolves.toEqual({ kind: "ok", next: null });

    findFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await expect(markSupportNoticeSeen("learner_1", "other_users", NOW)).resolves.toEqual({ kind: "notFound" });
  });

  it("a request that is not pending (dismissed, or reopened) is notPending", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });
    findFirstMock.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "req_1" });
    await expect(markSupportNoticeSeen("learner_1", "req_1", NOW)).resolves.toEqual({ kind: "notPending" });
  });
});
