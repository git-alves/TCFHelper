import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { isHubspotConfiguredMock, findManyMock, syncSupportRequestToHubspotMock } = vi.hoisted(() => ({
  isHubspotConfiguredMock: vi.fn(),
  findManyMock: vi.fn(),
  syncSupportRequestToHubspotMock: vi.fn(),
}));

vi.mock("@/lib/hubspot", () => ({ isHubspotConfigured: isHubspotConfiguredMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { supportRequest: { findMany: findManyMock } } }));
vi.mock("server-only", () => ({}));
vi.mock(import("@/lib/support-hubspot-sync"), async (importOriginal) => ({
  ...(await importOriginal()),
  syncSupportRequestToHubspot: syncSupportRequestToHubspotMock,
}));

const { GET } = await import("./route");

function request(authorization?: string) {
  return new NextRequest("http://localhost/api/cron/hubspot-support-sync-retry", {
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  isHubspotConfiguredMock.mockReset();
  findManyMock.mockReset();
  syncSupportRequestToHubspotMock.mockReset();
  vi.stubEnv("CRON_SECRET", "retry-test-secret");
  isHubspotConfiguredMock.mockReturnValue(true);
  findManyMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/cron/hubspot-support-sync-retry", () => {
  it("rejects missing or incorrect cron credentials without querying anything", async () => {
    const missing = await GET(request());
    const incorrect = await GET(request("Bearer wrong"));

    expect(missing.status).toBe(401);
    expect(incorrect.status).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("skips the backlog query entirely when HubSpot isn't configured", async () => {
    isHubspotConfiguredMock.mockReturnValue(false);

    const response = await GET(request("Bearer retry-test-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ skipped: "HubSpot is not configured" });
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it("only selects rows below the max attempt count that haven't fully synced", async () => {
    await GET(request("Bearer retry-test-secret"));

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { hubspotSyncedAt: null, hubspotSyncAttempts: { lt: 6 } },
      }),
    );
  });

  it("retries each pending row, resuming from its persisted progress, and tallies outcomes", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "support_1",
        senderEmail: "learner1@example.com",
        category: "BUG",
        details: "Broken.",
        hubspotTicketId: "ticket_existing",
        hubspotAttachmentFileId: null,
        hubspotAttachmentSyncedAt: null,
        user: { name: "Ada Lovelace" },
        attachment: null,
      },
      {
        id: "support_2",
        senderEmail: "learner2@example.com",
        category: "OTHER",
        details: "See attached.",
        hubspotTicketId: null,
        hubspotAttachmentFileId: null,
        hubspotAttachmentSyncedAt: null,
        user: { name: null },
        attachment: { data: new Uint8Array([1]), originalName: "log.txt", mimeType: "text/plain" },
      },
    ]);
    syncSupportRequestToHubspotMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("still down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(request("Bearer retry-test-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ attempted: 2, succeeded: 1, failed: 1 });
    expect(syncSupportRequestToHubspotMock).toHaveBeenNthCalledWith(1, {
      id: "support_1",
      senderEmail: "learner1@example.com",
      senderName: "Ada Lovelace",
      category: "BUG",
      details: "Broken.",
      hubspotTicketId: "ticket_existing",
      hubspotAttachmentFileId: null,
      hubspotAttachmentSyncedAt: null,
      attachment: null,
    });
    expect(syncSupportRequestToHubspotMock).toHaveBeenNthCalledWith(2, {
      id: "support_2",
      senderEmail: "learner2@example.com",
      senderName: null,
      category: "OTHER",
      details: "See attached.",
      hubspotTicketId: null,
      hubspotAttachmentFileId: null,
      hubspotAttachmentSyncedAt: null,
      attachment: { data: new Uint8Array([1]), originalName: "log.txt", mimeType: "text/plain" },
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith("HubSpot support sync retry failed", "still down");

    consoleErrorSpy.mockRestore();
  });
});
