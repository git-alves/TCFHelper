import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAdminUserMock, findManyMock, userFindUniqueMock, userWriteMocks, notFoundMock } = vi.hoisted(() => ({
  getCurrentAdminUserMock: vi.fn(),
  findManyMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  userWriteMocks: { update: vi.fn(), updateMany: vi.fn(), upsert: vi.fn(), create: vi.fn() },
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/components/admin-support-delete-button", () => ({ AdminSupportDeleteButton: () => null }));
vi.mock("@/components/admin-support-retry-button", () => ({ AdminSupportRetryButton: () => null }));
vi.mock("@/components/admin-support-resolve-button", () => ({
  AdminSupportResolveButton: ({ requestId, ticketNumber }: { requestId: string; ticketNumber: number }) => (
    <button data-testid="resolve-button" data-request={requestId} data-ticket={ticketNumber}>
      Mark as resolved
    </button>
  ),
}));
vi.mock("@/lib/app-user", () => {
  class AppUserProvisioningError extends Error {}
  return { AppUserProvisioningError, getCurrentAdminUser: getCurrentAdminUserMock };
});
vi.mock("@/components/admin-support-inbox-count", () => ({
  AdminSupportInboxSeen: ({ visitStartedAt }: { visitStartedAt: string }) => (
    <i data-testid="inbox-seen-sync" data-visit-started-at={visitStartedAt} />
  ),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    supportRequest: { findMany: findManyMock },
    user: { findUnique: userFindUniqueMock, ...userWriteMocks },
  },
}));
vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

const { default: AdminSupportPage } = await import("./page");

const BASE = {
  senderEmail: "learner@example.com",
  category: "BUG",
  details: "The editor freezes.",
  createdAt: new Date("2026-11-01T10:00:00.000Z"),
  hubspotTicketId: null,
  hubspotSyncedAt: null,
  hubspotSyncAttempts: 0,
  hubspotLastSyncError: null,
  attachment: null,
  resolvedAt: null,
  resolutionNote: null,
  noticeSeenAt: null,
  noticeDismissedAt: null,
  resolutionFeedback: null,
  feedbackAt: null,
};

async function render(rows: object[]) {
  findManyMock.mockResolvedValue(rows);
  return renderToStaticMarkup(await AdminSupportPage());
}

beforeEach(() => {
  getCurrentAdminUserMock.mockReset();
  findManyMock.mockReset();
  userFindUniqueMock.mockReset();
  for (const mock of Object.values(userWriteMocks)) mock.mockReset();
  notFoundMock.mockClear();
  getCurrentAdminUserMock.mockResolvedValue({ id: "cuid_owner" });
  userFindUniqueMock.mockResolvedValue({ supportInboxSeenAt: null });
});

describe("AdminSupportPage", () => {
  it("is not found for anyone but the owner", async () => {
    getCurrentAdminUserMock.mockResolvedValue(null);

    await expect(AdminSupportPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findManyMock).not.toHaveBeenCalled();
    // A non-admin reads nothing about the inbox.
    expect(userFindUniqueMock).not.toHaveBeenCalled();
  });

  it("selects the ticket number and resolution fields", async () => {
    await render([]);

    const { select } = findManyMock.mock.calls[0][0];
    expect(select).toMatchObject({
      ticketNumber: true,
      status: true,
      resolvedAt: true,
      resolutionNote: true,
      noticeSeenAt: true,
      noticeDismissedAt: true,
      resolutionFeedback: true,
      feedbackAt: true,
    });
  });

  it("shows an open ticket with its number, status and a Mark as resolved button, and no resolution block", async () => {
    const markup = await render([{ ...BASE, id: "req_1", ticketNumber: 42, status: "OPEN" }]);

    expect(markup).toContain("Ticket #42");
    expect(markup).toContain("Open");
    expect(markup).toContain('data-request="req_1"');
    expect(markup).toContain('data-ticket="42"');
    expect(markup).not.toContain("ticket-resolution");
  });

  it("shows a resolved ticket with its time, the note, that the learner has not seen it, and no button", async () => {
    const markup = await render([
      {
        ...BASE,
        id: "req_2",
        ticketNumber: 7,
        status: "RESOLVED",
        resolvedAt: new Date("2026-11-12T10:00:00.000Z"),
        resolutionNote: "We fixed the editor.",
      },
    ]);

    expect(markup).toContain("Ticket #7");
    expect(markup).toContain("Resolved");
    expect(markup).toContain("Note: We fixed the editor.");
    expect(markup).toContain("Learner notice: not seen yet");
    expect(markup).toContain("Learner feedback: none");
    expect(markup).not.toContain("resolve-button");
  });

  it("shows when the learner saw the notice without answering", async () => {
    const markup = await render([
      {
        ...BASE,
        id: "req_3",
        ticketNumber: 8,
        status: "RESOLVED",
        resolvedAt: new Date("2026-11-12T10:00:00.000Z"),
        noticeSeenAt: new Date("2026-11-12T11:00:00.000Z"),
      },
    ]);

    expect(markup).toMatch(/Learner notice: seen .*, not answered/);
  });

  it("shows dismissal and the Worked answer with its time", async () => {
    const markup = await render([
      {
        ...BASE,
        id: "req_4",
        ticketNumber: 9,
        status: "RESOLVED",
        resolvedAt: new Date("2026-11-12T10:00:00.000Z"),
        noticeSeenAt: new Date("2026-11-12T11:00:00.000Z"),
        noticeDismissedAt: new Date("2026-11-12T11:01:00.000Z"),
        resolutionFeedback: "WORKED",
        feedbackAt: new Date("2026-11-12T11:01:00.000Z"),
      },
    ]);

    expect(markup).toMatch(/Learner notice: dismissed .* \(seen .*\)/);
    expect(markup).toMatch(/Learner feedback: Worked \(/);
  });

  it("a reopened ticket is visibly Open again, still showing its earlier resolution and the learner's answer, with the button back", async () => {
    const markup = await render([
      {
        ...BASE,
        id: "req_5",
        ticketNumber: 10,
        status: "OPEN",
        resolvedAt: new Date("2026-11-12T10:00:00.000Z"),
        resolutionNote: "Cleared your cache.",
        noticeSeenAt: new Date("2026-11-12T11:00:00.000Z"),
        noticeDismissedAt: new Date("2026-11-12T11:01:00.000Z"),
        resolutionFeedback: "STILL_BROKEN",
        feedbackAt: new Date("2026-11-12T11:01:00.000Z"),
      },
    ]);

    expect(markup).toMatch(/data-testid="ticket-status"[^>]*>Open</);
    expect(markup).toContain("Reopened — earlier resolution");
    expect(markup).toContain("Note: Cleared your cache.");
    expect(markup).toMatch(/Learner feedback: Still has the problem \(/);
    expect(markup).toContain('data-testid="resolve-button"');
  });
});

describe("AdminSupportPage new-ticket tags and the inbox visit", () => {
  const LAST_VISIT = new Date("2026-11-10T12:00:00.000Z");
  const tags = (markup: string) => [...markup.matchAll(/data-testid="ticket-new-tag"[^>]*>([^<]*)</g)].map((m) => m[1]);

  it("only reads while rendering: no write of any kind, however many times it renders", async () => {
    userFindUniqueMock.mockResolvedValue({ supportInboxSeenAt: LAST_VISIT });
    findManyMock.mockResolvedValue([{ ...BASE, id: "r_1", ticketNumber: 1, status: "OPEN" }]);

    renderToStaticMarkup(await AdminSupportPage());
    renderToStaticMarkup(await AdminSupportPage());

    for (const [name, mock] of Object.entries(userWriteMocks)) {
      expect(mock, `user.${name}`).not.toHaveBeenCalled();
    }
  });

  it("hands the render time to the client component that records the visit after mount", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-11-12T09:30:00.000Z"));

      const markup = await render([]);

      expect(markup).toContain('data-visit-started-at="2026-11-12T09:30:00.000Z"');
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads the previous visit for the tags (not the render time it hands to the client)", async () => {
    userFindUniqueMock.mockResolvedValue({ supportInboxSeenAt: LAST_VISIT });
    findManyMock.mockResolvedValue([]);

    renderToStaticMarkup(await AdminSupportPage());

    expect(userFindUniqueMock).toHaveBeenCalledWith({ where: { id: "cuid_owner" }, select: { supportInboxSeenAt: true } });
  });

  it("tags the tickets that were new before this visit as New or Reopened, and no others", async () => {
    userFindUniqueMock.mockResolvedValue({ supportInboxSeenAt: LAST_VISIT });
    const markup = await render([
      { ...BASE, id: "r_new", ticketNumber: 12, status: "OPEN", createdAt: new Date("2026-11-11T08:00:00.000Z") },
      {
        ...BASE,
        id: "r_reopened",
        ticketNumber: 8,
        status: "OPEN",
        createdAt: new Date("2026-11-01T08:00:00.000Z"),
        resolvedAt: new Date("2026-11-05T08:00:00.000Z"),
        resolutionFeedback: "STILL_BROKEN",
        feedbackAt: new Date("2026-11-11T09:00:00.000Z"),
      },
      { ...BASE, id: "r_old", ticketNumber: 3, status: "OPEN", createdAt: new Date("2026-11-02T08:00:00.000Z") },
      {
        ...BASE,
        id: "r_reopened_before",
        ticketNumber: 4,
        status: "OPEN",
        createdAt: new Date("2026-11-01T08:00:00.000Z"),
        resolvedAt: new Date("2026-11-03T08:00:00.000Z"),
        resolutionFeedback: "STILL_BROKEN",
        feedbackAt: new Date("2026-11-04T09:00:00.000Z"),
      },
      {
        ...BASE,
        id: "r_resolved",
        ticketNumber: 13,
        status: "RESOLVED",
        createdAt: new Date("2026-11-11T08:00:00.000Z"),
        resolvedAt: new Date("2026-11-11T09:00:00.000Z"),
      },
    ]);

    expect(tags(markup)).toEqual(["New", "Reopened"]);
    expect(markup).toContain("bg-red-500/[.04]");
  });

  it("with no earlier visit tags every open ticket", async () => {
    const markup = await render([
      { ...BASE, id: "r_1", ticketNumber: 1, status: "OPEN" },
      { ...BASE, id: "r_2", ticketNumber: 2, status: "OPEN" },
      { ...BASE, id: "r_3", ticketNumber: 3, status: "RESOLVED", resolvedAt: new Date("2026-11-02T08:00:00.000Z") },
    ]);

    expect(tags(markup)).toEqual(["New", "New"]);
    expect(markup).toContain('data-testid="inbox-seen-sync"');
  });
});

