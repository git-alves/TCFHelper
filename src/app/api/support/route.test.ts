import { beforeEach, describe, expect, it, vi } from "vitest";
import { SUPPORT_ATTACHMENT_MAX_BYTES } from "@/lib/support-request";

const {
  getCurrentAppUserMock,
  AppUserProvisioningErrorMock,
  createMock,
  isHubspotConfiguredMock,
  syncSupportRequestToHubspotMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    createMock: vi.fn(),
    isHubspotConfiguredMock: vi.fn(),
    syncSupportRequestToHubspotMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({
  getCurrentAppUser: getCurrentAppUserMock,
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { supportRequest: { create: createMock } },
}));
vi.mock("@/lib/hubspot", () => ({
  isHubspotConfigured: isHubspotConfiguredMock,
}));
vi.mock("@/lib/support-hubspot-sync", () => ({
  syncSupportRequestToHubspot: syncSupportRequestToHubspotMock,
}));

const { POST } = await import("./route");

type SubmittedFile = {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function supportRequest(fields: Record<string, Array<string | SubmittedFile>>): Request {
  const formData = {
    keys: function* () {
      yield* Object.keys(fields);
    },
    getAll: (name: string) => fields[name] ?? [],
  };

  return {
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

beforeEach(() => {
  getCurrentAppUserMock.mockReset();
  createMock.mockReset();
  isHubspotConfiguredMock.mockReset();
  syncSupportRequestToHubspotMock.mockReset();

  getCurrentAppUserMock.mockResolvedValue({ id: "learner_1", email: "learner@example.com", name: "Ada Lovelace" });
  createMock.mockResolvedValue({ id: "support_1" });
  isHubspotConfiguredMock.mockReturnValue(false);
});

describe("POST /api/support", () => {
  it("requires an authenticated learner before reading or storing a support request", async () => {
    getCurrentAppUserMock.mockResolvedValue(null);

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("fails closed while the signed-in account cannot be provisioned", async () => {
    getCurrentAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("identity unavailable"));

    const response = await POST(supportRequest({ category: ["QUESTION"], details: ["How do I restart? "] }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Your account is still being set up. Please try again.",
      code: "ACCOUNT_PROVISIONING_UNAVAILABLE",
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects malformed categories and duplicate form fields before writing", async () => {
    const response = await POST(
      supportRequest({ category: ["BUG", "QUESTION"], details: ["The editor freezes."] }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid support request." });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("persists the authenticated sender rather than accepting a sender from the browser", async () => {
    const response = await POST(
      supportRequest({ category: ["FEATURE_REQUEST_FEEDBACK"], details: ["  Add keyboard shortcuts.  "] }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "support_1" });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "learner_1",
        senderEmail: "learner@example.com",
        category: "FEATURE_REQUEST_FEEDBACK",
        details: "Add keyboard shortcuts.",
      },
      select: { id: true },
    });
  });

  it("stores one accepted attachment with its actual byte length", async () => {
    const file: SubmittedFile = {
      name: "steps.pdf",
      type: "application/pdf",
      size: 999,
      arrayBuffer: async () => new Uint8Array([10, 20, 30]).buffer,
    };

    const response = await POST(
      supportRequest({ category: ["BUG"], details: ["The editor freezes."], attachment: [file] }),
    );

    expect(response.status).toBe(201);
    const createCall = createMock.mock.calls[0]?.[0];
    expect(createCall.data.attachment.create).toMatchObject({
      originalName: "steps.pdf",
      mimeType: "application/pdf",
      byteSize: 3,
    });
    expect(Array.from(createCall.data.attachment.create.data)).toEqual([10, 20, 30]);
  });

  it("rejects an oversized attachment before reading it or writing a request", async () => {
    const arrayBuffer = vi.fn();
    const file: SubmittedFile = {
      name: "too-large.pdf",
      type: "application/pdf",
      size: SUPPORT_ATTACHMENT_MAX_BYTES + 1,
      arrayBuffer,
    };

    const response = await POST(
      supportRequest({ category: ["BUG"], details: ["The editor freezes."], attachment: [file] }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid attachment." });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("does not expose persistence errors containing a learner's support message", async () => {
    createMock.mockRejectedValue(new Error("database rejected the sensitive details"));

    const response = await POST(supportRequest({ category: ["OTHER"], details: ["private report"] }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Support is temporarily unavailable. Please try again.",
    });
  });

  it("skips HubSpot sync entirely when it isn't configured", async () => {
    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(201);
    expect(syncSupportRequestToHubspotMock).not.toHaveBeenCalled();
  });

  it("mirrors a newly created request to HubSpot with no prior progress", async () => {
    isHubspotConfiguredMock.mockReturnValue(true);
    syncSupportRequestToHubspotMock.mockResolvedValue(undefined);

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(201);
    expect(syncSupportRequestToHubspotMock).toHaveBeenCalledWith({
      id: "support_1",
      senderEmail: "learner@example.com",
      senderName: "Ada Lovelace",
      category: "BUG",
      details: "The editor freezes.",
      hubspotTicketId: null,
      hubspotAttachmentSyncedAt: null,
      attachment: null,
    });
  });

  it("still returns success to the learner when HubSpot sync fails", async () => {
    isHubspotConfiguredMock.mockReturnValue(true);
    syncSupportRequestToHubspotMock.mockRejectedValue(new Error("HubSpot is down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(supportRequest({ category: ["BUG"], details: ["The editor freezes."] }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: "support_1" });
    expect(consoleErrorSpy).toHaveBeenCalledWith("HubSpot support sync failed", "HubSpot is down");

    consoleErrorSpy.mockRestore();
  });
});
