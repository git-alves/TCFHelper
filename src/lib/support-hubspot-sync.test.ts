import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  upsertHubspotContactMock,
  findOrCreateHubspotTicketMock,
  associateHubspotDefaultMock,
  uploadHubspotFileMock,
  findOrCreateHubspotAttachmentNoteMock,
  updateMock,
} = vi.hoisted(() => ({
  upsertHubspotContactMock: vi.fn(),
  findOrCreateHubspotTicketMock: vi.fn(),
  associateHubspotDefaultMock: vi.fn(),
  uploadHubspotFileMock: vi.fn(),
  findOrCreateHubspotAttachmentNoteMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/hubspot", () => ({
  upsertHubspotContact: upsertHubspotContactMock,
  findOrCreateHubspotTicket: findOrCreateHubspotTicketMock,
  associateHubspotDefault: associateHubspotDefaultMock,
  uploadHubspotFile: uploadHubspotFileMock,
  findOrCreateHubspotAttachmentNote: findOrCreateHubspotAttachmentNoteMock,
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
  hubspotAttachmentFileId: null,
  hubspotAttachmentSyncedAt: null,
  attachment: null,
};

beforeEach(() => {
  upsertHubspotContactMock.mockReset();
  findOrCreateHubspotTicketMock.mockReset();
  associateHubspotDefaultMock.mockReset();
  uploadHubspotFileMock.mockReset();
  findOrCreateHubspotAttachmentNoteMock.mockReset();
  updateMock.mockReset();

  upsertHubspotContactMock.mockResolvedValue("contact_1");
  findOrCreateHubspotTicketMock.mockResolvedValue("ticket_1");
  associateHubspotDefaultMock.mockResolvedValue(undefined);
  uploadHubspotFileMock.mockResolvedValue("file_1");
  findOrCreateHubspotAttachmentNoteMock.mockResolvedValue("note_1");
  updateMock.mockResolvedValue(undefined);
});

describe("syncSupportRequestToHubspot", () => {
  it("creates a new ticket via the dedupe-safe finder, persists its id, associates the contact, and marks the row synced", async () => {
    await syncSupportRequestToHubspot(baseRequest);

    expect(findOrCreateHubspotTicketMock).toHaveBeenCalledWith({
      supportRequestId: "support_1",
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

  it("reuses an already-persisted ticket id instead of calling the finder again", async () => {
    await syncSupportRequestToHubspot({ ...baseRequest, hubspotTicketId: "ticket_existing" });

    expect(findOrCreateHubspotTicketMock).not.toHaveBeenCalled();
    expect(associateHubspotDefaultMock).toHaveBeenCalledWith(
      { type: "tickets", id: "ticket_existing" },
      { type: "contacts", id: "contact_1" },
    );
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it("uploads an attachment, persists the file id, creates the note via the dedupe-safe finder, and marks it synced", async () => {
    const attachment = { data: new Uint8Array([1, 2, 3]), originalName: "log.txt", mimeType: "text/plain" };

    await syncSupportRequestToHubspot({ ...baseRequest, attachment });

    expect(uploadHubspotFileMock).toHaveBeenCalledWith({
      data: attachment.data,
      fileName: "log.txt",
      mimeType: "text/plain",
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "support_1" },
      data: { hubspotAttachmentFileId: "file_1" },
    });
    expect(findOrCreateHubspotAttachmentNoteMock).toHaveBeenCalledWith({
      supportRequestId: "support_1",
      fileId: "file_1",
      fileName: "log.txt",
    });
    expect(associateHubspotDefaultMock).toHaveBeenCalledWith(
      { type: "notes", id: "note_1" },
      { type: "tickets", id: "ticket_1" },
    );
    expect(associateHubspotDefaultMock).toHaveBeenCalledWith(
      { type: "notes", id: "note_1" },
      { type: "contacts", id: "contact_1" },
    );
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "support_1" },
      data: { hubspotAttachmentSyncedAt: expect.any(Date) },
    });
  });

  it("skips re-uploading a file that a previous attempt already uploaded", async () => {
    const attachment = { data: new Uint8Array([1, 2, 3]), originalName: "log.txt", mimeType: "text/plain" };

    await syncSupportRequestToHubspot({ ...baseRequest, hubspotAttachmentFileId: "file_existing", attachment });

    expect(uploadHubspotFileMock).not.toHaveBeenCalled();
    expect(findOrCreateHubspotAttachmentNoteMock).toHaveBeenCalledWith({
      supportRequestId: "support_1",
      fileId: "file_existing",
      fileName: "log.txt",
    });
  });

  it("skips the whole attachment step once it's already fully synced", async () => {
    const attachment = { data: new Uint8Array([1, 2, 3]), originalName: "log.txt", mimeType: "text/plain" };

    await syncSupportRequestToHubspot({
      ...baseRequest,
      hubspotTicketId: "ticket_existing",
      hubspotAttachmentSyncedAt: new Date("2026-01-01"),
      attachment,
    });

    expect(uploadHubspotFileMock).not.toHaveBeenCalled();
    expect(findOrCreateHubspotAttachmentNoteMock).not.toHaveBeenCalled();
  });

  it("records the attempt count and error, then rethrows, when a step fails", async () => {
    findOrCreateHubspotTicketMock.mockRejectedValue(new Error("HubSpot POST failed with 500"));

    await expect(syncSupportRequestToHubspot(baseRequest)).rejects.toThrow("HubSpot POST failed with 500");

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "support_1" },
      data: { hubspotSyncAttempts: { increment: 1 }, hubspotLastSyncError: "HubSpot POST failed with 500" },
    });
  });

  it("does not lose the original error if recording the failure itself fails", async () => {
    findOrCreateHubspotTicketMock.mockRejectedValue(new Error("HubSpot POST failed with 500"));
    updateMock.mockRejectedValue(new Error("database unavailable"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(syncSupportRequestToHubspot(baseRequest)).rejects.toThrow("HubSpot POST failed with 500");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to record HubSpot sync failure state");

    consoleErrorSpy.mockRestore();
  });

  it("stays safe if HubSpot creates the ticket but persisting its id locally fails: the next attempt relies on findOrCreateHubspotTicket's own dedupe, not on this write having succeeded", async () => {
    updateMock.mockImplementationOnce(() => Promise.reject(new Error("database unavailable")));

    await expect(syncSupportRequestToHubspot(baseRequest)).rejects.toThrow("database unavailable");

    // The row is left with no local ticket id -- a subsequent attempt calls
    // findOrCreateHubspotTicket again, which is what makes this safe: it
    // hits HubSpot's own uniqueness constraint on support_request_id rather
    // than blindly creating a second ticket.
    findOrCreateHubspotTicketMock.mockClear();
    updateMock.mockReset();
    updateMock.mockResolvedValue(undefined);
    await syncSupportRequestToHubspot(baseRequest);
    expect(findOrCreateHubspotTicketMock).toHaveBeenCalledTimes(1);
  });
});
