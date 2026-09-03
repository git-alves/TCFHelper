import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, isHubspotConfiguredMock, findUniqueMock, syncSupportRequestToHubspotMock } = vi.hoisted(
  () => ({
    getAdminApiUserMock: vi.fn(),
    isHubspotConfiguredMock: vi.fn(),
    findUniqueMock: vi.fn(),
    syncSupportRequestToHubspotMock: vi.fn(),
  }),
);

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/hubspot", () => ({ isHubspotConfigured: isHubspotConfiguredMock }));
vi.mock("@/lib/prisma", () => ({
  prisma: { supportRequest: { findUnique: findUniqueMock } },
}));
vi.mock("server-only", () => ({}));
vi.mock(import("@/lib/support-hubspot-sync"), async (importOriginal) => ({
  ...(await importOriginal()),
  syncSupportRequestToHubspot: syncSupportRequestToHubspotMock,
}));

const { POST } = await import("./route");

function retry(requestId = "cuid_support_request_1") {
  return POST(new Request(`http://localhost/api/admin/support/${requestId}/retry-hubspot`, { method: "POST" }), {
    params: Promise.resolve({ requestId }),
  });
}

const pendingRow = {
  hubspotSyncedAt: null,
  id: "cuid_support_request_1",
  senderEmail: "learner@example.com",
  category: "BUG",
  details: "Broken.",
  hubspotTicketId: null,
  hubspotAttachmentFileId: null,
  hubspotAttachmentSyncedAt: null,
  user: { name: "Ada Lovelace" },
  attachment: null,
};

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  isHubspotConfiguredMock.mockReset();
  findUniqueMock.mockReset();
  syncSupportRequestToHubspotMock.mockReset();

  getAdminApiUserMock.mockResolvedValue({ id: "cuid_owner" });
  isHubspotConfiguredMock.mockReturnValue(true);
  findUniqueMock.mockResolvedValue(pendingRow);
  syncSupportRequestToHubspotMock.mockResolvedValue(undefined);
});

describe("POST /api/admin/support/[requestId]/retry-hubspot", () => {
  it("does not disclose the route to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await retry();

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("refuses to retry when HubSpot isn't configured", async () => {
    isHubspotConfiguredMock.mockReturnValue(false);

    const response = await retry();

    expect(response.status).toBe(409);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a request id that doesn't exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await retry();

    expect(response.status).toBe(404);
    expect(syncSupportRequestToHubspotMock).not.toHaveBeenCalled();
  });

  it("refuses to re-sync a request that's already fully synced", async () => {
    findUniqueMock.mockResolvedValue({ ...pendingRow, hubspotSyncedAt: new Date("2026-01-01") });

    const response = await retry();

    expect(response.status).toBe(409);
    expect(syncSupportRequestToHubspotMock).not.toHaveBeenCalled();
  });

  it("re-attempts the sync regardless of how many prior attempts failed, resuming from persisted progress", async () => {
    findUniqueMock.mockResolvedValue({ ...pendingRow, hubspotTicketId: "ticket_existing" });

    const response = await retry();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ synced: true });
    expect(syncSupportRequestToHubspotMock).toHaveBeenCalledWith({
      id: "cuid_support_request_1",
      senderEmail: "learner@example.com",
      senderName: "Ada Lovelace",
      category: "BUG",
      details: "Broken.",
      hubspotTicketId: "ticket_existing",
      hubspotAttachmentFileId: null,
      hubspotAttachmentSyncedAt: null,
      attachment: null,
    });
  });

  it("surfaces the sync failure instead of a generic error", async () => {
    syncSupportRequestToHubspotMock.mockRejectedValue(new Error("HubSpot POST failed with 500"));

    const response = await retry();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "HubSpot POST failed with 500" });
  });
});
