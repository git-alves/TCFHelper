import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAdminUserMock, findManyMock, notFoundMock } = vi.hoisted(() => ({
  getCurrentAdminUserMock: vi.fn(),
  findManyMock: vi.fn(),
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
vi.mock("@/lib/prisma", () => ({ prisma: { supportRequest: { findMany: findManyMock } } }));
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
  notFoundMock.mockClear();
  getCurrentAdminUserMock.mockResolvedValue({ id: "cuid_owner" });
});

describe("AdminSupportPage", () => {
  it("is not found for anyone but the owner", async () => {
    getCurrentAdminUserMock.mockResolvedValue(null);

    await expect(AdminSupportPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(findManyMock).not.toHaveBeenCalled();
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
