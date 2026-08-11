import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  verifyWebhookMock,
  transactionMock,
  createManyMock,
  syncClerkUserMock,
  recordAuthSecuritySessionMock,
} = vi.hoisted(() => ({
  verifyWebhookMock: vi.fn(),
  transactionMock: vi.fn(),
  createManyMock: vi.fn(),
  syncClerkUserMock: vi.fn(),
  recordAuthSecuritySessionMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook: verifyWebhookMock }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transactionMock } }));
vi.mock("@/lib/app-user", () => ({ syncClerkUserFromWebhook: syncClerkUserMock }));
vi.mock("@/lib/auth-security", () => ({ recordAuthSecuritySession: recordAuthSecuritySessionMock }));

const { POST } = await import("./route");

function webhookRequest(deliveryId = "msg_1") {
  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    headers: { "svix-id": deliveryId },
    body: "{}",
  });
}

const userEvent = {
  type: "user.created",
  object: "event",
  data: { id: "user_clerk_1" },
  event_attributes: { http_request: { client_ip: "127.0.0.1", user_agent: "test" } },
};

const sessionEvent = {
  type: "session.created",
  object: "event",
  data: {
    id: "sess_clerk_1",
    user_id: "user_clerk_1",
    created_at: 1_786_000_000_000,
    actor: null,
    user: { id: "user_clerk_1" },
    latest_activity: { browser_name: "Chrome", device_type: "desktop", is_mobile: false },
  },
  event_attributes: { http_request: { client_ip: "203.0.113.9", user_agent: "raw user agent must not pass" } },
};

beforeEach(() => {
  verifyWebhookMock.mockReset();
  transactionMock.mockReset();
  createManyMock.mockReset();
  syncClerkUserMock.mockReset();
  recordAuthSecuritySessionMock.mockReset();

  verifyWebhookMock.mockResolvedValue(userEvent);
  createManyMock.mockResolvedValue({ count: 1 });
  syncClerkUserMock.mockResolvedValue(undefined);
  recordAuthSecuritySessionMock.mockResolvedValue({ kind: "recorded", alerted: false });
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({ clerkWebhookEvent: { createMany: createManyMock } }),
  );
});

describe("POST /api/webhooks/clerk", () => {
  it("rejects a request without a Svix delivery ID before attempting verification", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(400);
    expect(verifyWebhookMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid Clerk signature without touching local state", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("bad signature"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(400);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("records a verified user delivery and syncs it in the same transaction", async () => {
    const response = await POST(webhookRequest("msg_user_1"));

    expect(response.status).toBe(200);
    expect(createManyMock).toHaveBeenCalledWith({
      data: [{ id: "msg_user_1", type: "user.created" }],
      skipDuplicates: true,
    });
    expect(syncClerkUserMock).toHaveBeenCalledWith(
      userEvent.data,
      expect.objectContaining({ clerkWebhookEvent: expect.any(Object) }),
    );
  });

  it("does not repeat local synchronization for a redelivered Svix message", async () => {
    createManyMock.mockResolvedValue({ count: 0 });

    const response = await POST(webhookRequest("msg_duplicate"));

    expect(response.status).toBe(200);
    expect(syncClerkUserMock).not.toHaveBeenCalled();
  });

  it("records a verified Clerk session through the privacy-preserving helper", async () => {
    verifyWebhookMock.mockResolvedValue(sessionEvent);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(syncClerkUserMock).not.toHaveBeenCalled();
    expect(recordAuthSecuritySessionMock).toHaveBeenCalledWith({
      clerkUserId: "user_clerk_1",
      clerkSessionId: "sess_clerk_1",
      occurredAt: 1_786_000_000_000,
      clientIp: "203.0.113.9",
      browserName: "Chrome",
      deviceType: "desktop",
      isMobile: false,
      actor: null,
      embeddedUser: { id: "user_clerk_1" },
    });
    expect(recordAuthSecuritySessionMock.mock.calls[0]?.[0]).not.toHaveProperty("userAgent");
    expect(JSON.stringify(recordAuthSecuritySessionMock.mock.calls[0]?.[0])).not.toContain("raw user agent");
  });

  it("returns a retryable generic failure when verified session persistence fails", async () => {
    verifyWebhookMock.mockResolvedValue(sessionEvent);
    recordAuthSecuritySessionMock.mockRejectedValue(new Error("network value must not be logged"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook processing failed" });
    expect(errorSpy).toHaveBeenCalledWith("Clerk session telemetry processing failed");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("network value");
  });

  it("does not treat Clerk account deletion as permission to cascade-delete learner data", async () => {
    verifyWebhookMock.mockResolvedValue({ ...userEvent, type: "user.deleted" });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(syncClerkUserMock).not.toHaveBeenCalled();
  });

  it("returns a retryable failure when a verified local sync fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    syncClerkUserMock.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(webhookRequest());

    expect(response.status).toBe(500);
    expect(errorSpy).toHaveBeenCalledWith("Clerk webhook user sync failed", expect.any(Error));
  });
});
