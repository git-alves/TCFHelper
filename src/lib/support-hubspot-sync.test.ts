import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  upsertHubspotContactMock,
  createHubspotTicketMock,
  associateHubspotDefaultMock,
  attachHubspotFileMock,
  updateMock,
} = vi.hoisted(() => ({
  upsertHubspotContactMock: vi.fn(),
  createHubspotTicketMock: vi.fn(),
  associateHubspotDefaultMock: vi.fn(),
  attachHubspotFileMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/hubspot", () => ({
  upsertHubspotContact: upsertHubspotContactMock,
  createHubspotTicket: createHubspotTicketMock,
  associateHubspotDefault: associateHubspotDefaultMock,
  attachHubspotFile: attachHubspotFileMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { supportRequest: { update: updateMock } },
}));

const { syncSupportRequestToHubspot } = await import("./support-hubspot-sync");

const baseRequest = {
  id: "support_1",
  senderEmail: "learner@example.com",
  senderName: "Ada Lovelace",
  category: "BUG" as const,
  details: "The editor freezes.",
  hubspotTicketId: null,
  hubspotAttachmentSyncedAt: null,
  attachment: null,
};

beforeEach(() => {
  upsertHubspotContactMock.mockReset();
  createHubspotTicketMock.mockReset();
  associateHubspotDefaultMock.mockReset();
  attachHubspotFileMock.mockReset();
  updateMock.mockReset();

  upsertHubspotContactMock.mockResolvedValue("contact_1");
  createHubspotTicketMock.mockResolvedValue("ticket_1");
  associateHubspotDefaultMock.mockResolvedValue(undefined);
  attachHubspotFileMock.mockResolvedValue(undefined);
  updateMock.mockResolvedValue(undefined);
});

describe("syncSupportRequestToHubspot", () => {
  it("creates a new ticket, persists its id, associates the contact, and marks the row synced", async () => {
    await syncSupportRequestToHubspot(baseRequest);

    expect(createHubspotTicketMock).toHaveBeenCalledWith({
      category: "BUG",
      details: "The editor freezes.",
      senderEmail: "learner@example.com",
    });
    expect(associateHubspotDefaultMock).toHaveBeenCalledWith(
      { type: "tickets", id: "ticket_1" },
      { type: "contacts", id: "contact_1" },
    );
    expect(updateMock).toHaveBeenNthCalledWith(1, {
      where: { id: "support_1" },
      data: { hubspotTicketId: "ticket_1" },
    });
    expect(updateMock).toHaveBeenNthCalledWith(2, {
      where: { id: "support_1" },
      data: { hubspotSyncedAt: expect.any(Date), hubspotLastSyncError: null },
    });
  });

  it("reuses an already-created ticket id instead of creating a second ticket", async () => {
    await syncSupportRequestToHubspot({ ...baseRequest, hubspotTicketId: "ticket_existing" });

    expect(createHubspotTicketMock).not.toHaveBeenCalled();
    expect(associateHubspotDefaultMock).toHaveBeenCalledWith(
      { type: "tickets", id: "ticket_existing" },
      { type: "contacts", id: "contact_1" },
    );
    // No ticket-id persistence step needed since it already existed.
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "support_1" },
      data: { hubspotSyncedAt: expect.any(Date), hubspotLastSyncError: null },
    });
  });

  it("uploads and marks an attachment synced when one is present", async () => {
    const attachment = { data: new Uint8Array([1, 2, 3]), originalName: "log.txt", mimeType: "text/plain" };

    await syncSupportRequestToHubspot({ ...baseRequest, attachment });

    expect(attachHubspotFileMock).toHaveBeenCalledWith({ ticketId: "ticket_1", contactId: "contact_1", attachment });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "support_1" },
      data: { hubspotAttachmentSyncedAt: expect.any(Date) },
    });
  });

  it("skips re-uploading an attachment that a previous attempt already synced", async () => {
    const attachment = { data: new Uint8Array([1, 2, 3]), originalName: "log.txt", mimeType: "text/plain" };

    await syncSupportRequestToHubspot({
      ...baseRequest,
      hubspotTicketId: "ticket_existing",
      hubspotAttachmentSyncedAt: new Date("2026-01-01"),
      attachment,
    });

    expect(attachHubspotFileMock).not.toHaveBeenCalled();
  });

  it("records the attempt count and error, then rethrows, when a step fails", async () => {
    createHubspotTicketMock.mockRejectedValue(new Error("HubSpot POST failed with 500"));

    await expect(syncSupportRequestToHubspot(baseRequest)).rejects.toThrow("HubSpot POST failed with 500");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "support_1" },
      data: { hubspotSyncAttempts: { increment: 1 }, hubspotLastSyncError: "HubSpot POST failed with 500" },
    });
  });

  it("does not lose the original error if recording the failure itself fails", async () => {
    createHubspotTicketMock.mockRejectedValue(new Error("HubSpot POST failed with 500"));
    updateMock.mockRejectedValue(new Error("database unavailable"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(syncSupportRequestToHubspot(baseRequest)).rejects.toThrow("HubSpot POST failed with 500");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to record HubSpot sync failure state");

    consoleErrorSpy.mockRestore();
  });
});
