import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InactivityEmailSendStatus, Locale, Prisma } from "@prisma/client";

const send = vi.fn();
const prisma = {
  appConfig: { findUnique: vi.fn() },
  inactivityEmailTemplate: { findMany: vi.fn() },
  user: { findMany: vi.fn(), findFirst: vi.fn() },
  inactivityEmailSend: {
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));
const { runInactivityEmailCron } = await import("./inactivity-emails");

const now = new Date("2026-11-16T12:00:00Z");
const lastActiveAt = new Date("2026-10-01T12:00:00Z");
const candidate = {
  id: "user_1",
  email: "learner@example.com",
  name: "Ada",
  locale: Locale.en,
  lastActiveAt,
  isBlocked: false,
  isAdmin: false,
  inactivityEmailsUnsubscribedAt: null,
  redeemedAccessCodes: [{ id: "live-code" }],
  inactivityEmailSends: [],
};
const live = {
  isBlocked: false,
  isAdmin: false,
  inactivityEmailsUnsubscribedAt: null,
  redeemedAccessCodes: [{ id: "live-code" }],
  lastActiveAt,
};
function env() {
  vi.stubEnv("RESEND_API_KEY", "key");
  vi.stubEnv("EMAIL_FROM", "MyTCFLab <mail@example.com>");
  vi.stubEnv("INACTIVITY_EMAIL_LEGAL_ADDRESS", "1 Main St");
  vi.stubEnv("INACTIVITY_EMAIL_SUPPORT_EMAIL", "support@example.com");
  vi.stubEnv("INACTIVITY_EMAIL_UNSUBSCRIBE_SECRET", "long-test-secret");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
}
function configured() {
  prisma.appConfig.findUnique.mockResolvedValue({
    inactivityEmailsEnabled: true,
  });
  prisma.inactivityEmailTemplate.findMany.mockResolvedValue([]);
  prisma.user.findMany.mockResolvedValue([candidate]);
  prisma.user.findFirst.mockResolvedValue(live);
  prisma.inactivityEmailSend.create.mockResolvedValue({ id: "claim_1" });
  send.mockResolvedValue({ data: { id: "message_1" }, error: null });
}
beforeEach(() => {
  Object.values(prisma).forEach((group) =>
    Object.values(group).forEach((fn) => fn.mockReset()),
  );
  send.mockReset();
  env();
  configured();
});
afterEach(() => vi.unstubAllEnvs());

describe("runInactivityEmailCron", () => {
  it("does not construct a send while switched off", async () => {
    prisma.appConfig.findUnique.mockResolvedValue({
      inactivityEmailsEnabled: false,
    });
    await expect(runInactivityEmailCron(now)).resolves.toMatchObject({
      skipped: "off",
    });
    expect(send).not.toHaveBeenCalled();
  });
  it.each([
    "RESEND_API_KEY",
    "EMAIL_FROM",
    "INACTIVITY_EMAIL_SUPPORT_EMAIL",
    "INACTIVITY_EMAIL_UNSUBSCRIBE_SECRET",
  ])("does not send when %s is missing", async (name) => {
    vi.stubEnv(name, "");
    await runInactivityEmailCron(now);
    expect(send).not.toHaveBeenCalled();
  });
  it("does not send with a non-HTTPS app URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://app.example.com");
    await runInactivityEmailCron(now);
    expect(send).not.toHaveBeenCalled();
  });
  it("skips a duplicate claim", async () => {
    prisma.inactivityEmailSend.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    await runInactivityEmailCron(now);
    expect(send).not.toHaveBeenCalled();
  });
  it("records a successful send with idempotency and unsubscribe headers", async () => {
    await expect(runInactivityEmailCron(now)).resolves.toMatchObject({
      sent: 1,
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          "List-Unsubscribe": expect.stringContaining(
            "/api/unsubscribe/inactivity?token=",
          ),
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }),
      }),
      { idempotencyKey: "inactivity-claim_1-1" },
    );
    expect(prisma.inactivityEmailSend.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: InactivityEmailSendStatus.SENT,
          resendMessageId: "message_1",
        }),
      }),
    );
  });
  it("records a definite 4xx rejection as failed", async () => {
    send.mockResolvedValue({
      data: null,
      error: { statusCode: 422, message: "rejected" },
    });
    await runInactivityEmailCron(now);
    expect(prisma.inactivityEmailSend.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: InactivityEmailSendStatus.FAILED,
        }),
      }),
    );
  });
  it("stops on a 429 and removes a new pending claim", async () => {
    send.mockResolvedValue({
      data: null,
      error: { statusCode: 429, message: "limited" },
    });
    await expect(runInactivityEmailCron(now, 0)).resolves.toMatchObject({
      skipped: "rate_limited",
    });
    expect(prisma.inactivityEmailSend.delete).toHaveBeenCalledWith({
      where: { id: "claim_1" },
    });
  });
  it.each([
    { statusCode: null, name: "application_error", message: "network" },
    { statusCode: 500, name: "application_error", message: "server" },
    { statusCode: 502, name: "application_error", message: "gateway" },
  ])(
    "leaves returned uncertain Resend errors pending: $statusCode",
    async (error) => {
      send.mockResolvedValue({ data: null, error });
      await expect(runInactivityEmailCron(now, 0)).resolves.toMatchObject({
        sent: 0,
      });
      expect(prisma.inactivityEmailSend.update).not.toHaveBeenCalled();
    },
  );
  it("leaves a claim pending on network errors or failed SENT persistence", async () => {
    send.mockRejectedValueOnce(new Error("network"));
    await runInactivityEmailCron(now);
    expect(prisma.inactivityEmailSend.update).not.toHaveBeenCalled();
    configured();
    prisma.inactivityEmailSend.update.mockRejectedValueOnce(new Error("db"));
    await runInactivityEmailCron(now);
    expect(prisma.inactivityEmailSend.update).toHaveBeenCalledTimes(1);
  });
  it("escapes a learner name in HTML", async () => {
    prisma.user.findMany.mockResolvedValue([
      { ...candidate, name: "<script>alert(1)</script>" },
    ]);
    await runInactivityEmailCron(now);
    expect(send.mock.calls[0][0].html).toContain("&lt;script&gt;");
  });
});
