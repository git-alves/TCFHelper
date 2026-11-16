import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InactivityEmailSendStatus, Locale, Prisma } from "@prisma/client";
import { accessCodeIsLiveWhere } from "@/lib/access-code-expiry";

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
const { runInactivityEmailCron, sendInactivityEmailTest } =
  await import("./inactivity-emails");

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
    expect(prisma.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          redeemedAccessCodes: {
            where: accessCodeIsLiveWhere(now),
            select: { id: true },
            take: 1,
          },
        }),
      }),
    );
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
    const html = send.mock.calls[0][0].html;
    expect(html).toContain('<meta name="color-scheme" content="light">');
    expect(html).toContain(
      '<td bgcolor="#6D28D9" style="background-color:#6D28D9;border-radius:8px;padding:12px 18px;"><a href="https://app.example.com/dashboard" style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;mso-line-height-rule:exactly;color:#ffffff;font-weight:600;text-decoration:none;">Return to MyTCFLab</a>',
    );
    const wordmarkIndex = html.indexOf("MyTCFLab</p>");
    const headingIndex = html.indexOf(
      "<h1 style=\"margin:38px 0 0;",
    );
    const bodyIndex = html.indexOf("Your MyTCFLab space is still here");
    const buttonIndex = html.indexOf('bgcolor="#6D28D9"');
    const noReplyIndex = html.indexOf(
      "This is an automatic email — please don’t reply.",
    );
    const footerIndex = html.indexOf("/unsubscribe/inactivity?token=");
    expect(wordmarkIndex).toBeGreaterThan(-1);
    expect(headingIndex).toBeGreaterThan(wordmarkIndex);
    expect(bodyIndex).toBeGreaterThan(-1);
    expect(bodyIndex).toBeGreaterThan(headingIndex);
    expect(buttonIndex).toBeGreaterThan(bodyIndex);
    expect(noReplyIndex).toBeGreaterThan(buttonIndex);
    expect(footerIndex).toBeGreaterThan(noReplyIndex);
  });
  it("uses the shared CTA button in a test email", async () => {
    await expect(
      sendInactivityEmailTest({
        to: "owner@example.com",
        kind: "SEVEN_DAY",
        locale: Locale.en,
        subject: "Hello <b>{name}</b>",
        body: "Hello {name}",
      }),
    ).resolves.toBe("message_1");
    expect(send.mock.calls[0][0].html).toContain(
      "<h1 style=\"margin:38px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;mso-line-height-rule:exactly;font-weight:700;letter-spacing:-0.4px;color:#18181b;\">Hello &lt;b&gt;Alex&lt;/b&gt;</h1>",
    );
    expect(send.mock.calls[0][0].html).toContain(
      '<td bgcolor="#6D28D9" style="background-color:#6D28D9;border-radius:8px;padding:12px 18px;"><a href="https://app.example.com/dashboard" style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;mso-line-height-rule:exactly;color:#ffffff;font-weight:600;text-decoration:none;">Return to MyTCFLab</a>',
    );
  });
  it.each([
    [Locale.pt, "Este é um e-mail automático — por favor, não responda."],
    [
      Locale.fr,
      "Ceci est un e-mail automatique — merci de ne pas y répondre.",
    ],
  ])("localizes the no-reply note for %s", async (locale, note) => {
    await sendInactivityEmailTest({
      to: "owner@example.com",
      kind: "SEVEN_DAY",
      locale,
      subject: "Hello",
      body: "Hello",
    });
    expect(send.mock.calls[0][0].html).toContain(note);
  });
  it("escapes and preserves a learner name in the heading and body", async () => {
    prisma.user.findMany.mockResolvedValue([
      { ...candidate, name: "<b>$&" },
    ]);
    prisma.inactivityEmailTemplate.findMany.mockResolvedValue([
      {
        kind: "THIRTY_DAY",
        locale: Locale.en,
        subject: "Hello {name}",
        body: "Hi {name}",
      },
    ]);
    await runInactivityEmailCron(now);
    const html = send.mock.calls[0][0].html;
    expect(html).toContain("<h1");
    expect(html).toContain("Hello &lt;b&gt;$&amp;");
    expect(html).toContain("Hi &lt;b&gt;$&amp;");
  });
  it("omits a missing name from the sent subject, heading, and body", async () => {
    prisma.user.findMany.mockResolvedValue([{ ...candidate, name: null }]);
    prisma.inactivityEmailTemplate.findMany.mockResolvedValue([
      {
        kind: "THIRTY_DAY",
        locale: Locale.en,
        subject: "Hello, {name}",
        body: "Hi {name},",
      },
    ]);
    await runInactivityEmailCron(now);
    const message = send.mock.calls[0][0];
    expect(message.subject).toBe("Hello");
    expect(message.html).toContain(
      '<h1 style="margin:38px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:34px;mso-line-height-rule:exactly;font-weight:700;letter-spacing:-0.4px;color:#18181b;">Hello</h1>',
    );
    expect(message.html).toContain(">Hi,</div>");
    expect(message.html).not.toContain("{name}");
  });
  it("uses only a learner's first name in the subject, heading, and body", async () => {
    prisma.user.findMany.mockResolvedValue([
      { ...candidate, name: "Maria Silva" },
    ]);
    prisma.inactivityEmailTemplate.findMany.mockResolvedValue([
      {
        kind: "THIRTY_DAY",
        locale: Locale.en,
        subject: "Hello {name}",
        body: "Hi {name}",
      },
    ]);
    await runInactivityEmailCron(now);
    const message = send.mock.calls[0][0];
    expect(message.subject).toBe("Hello Maria");
    expect(message.html).toContain("Hello Maria</h1>");
    expect(message.html).toContain(">Hi Maria</div>");
    expect(message.html).not.toContain("Maria Silva");
  });
  it.each([
    ["<br>", "&lt;br&gt;"],
    ["{appUrl}", "{appUrl}"],
  ])("renders the name %s literally in the heading and body", async (name, renderedName) => {
    prisma.user.findMany.mockResolvedValue([{ ...candidate, name }]);
    prisma.inactivityEmailTemplate.findMany.mockResolvedValue([
      {
        kind: "THIRTY_DAY",
        locale: Locale.en,
        subject: "Hello {name}",
        body: "Hi {name}",
      },
    ]);
    await runInactivityEmailCron(now);
    const html = send.mock.calls[0][0].html;
    expect(html).toContain(`Hello ${renderedName}</h1>`);
    expect(html).toContain(`>Hi ${renderedName}</div>`);
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
