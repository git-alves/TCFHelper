import { afterEach, describe, expect, it, vi } from "vitest";
import {
  InactivityEmailKind,
  InactivityEmailSendStatus,
  Locale,
} from "@prisma/client";
import { accessCodeIsLiveWhere } from "@/lib/access-code-expiry";
import { inactivityEmailFirstName } from "@/lib/inactivity-email-name";

const findMany = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany } } }));

const {
  defaultInactivityTemplate,
  isEligibleForInactivityEmail,
  renderInactivityEmailCta,
  renderInactivityEmailText,
  selectInactivityEmailCandidates,
  signInactivityUnsubscribeToken,
  validateInactivityTemplate,
  verifyInactivityUnsubscribeToken,
} = await import("./inactivity-emails");

afterEach(() => {
  vi.unstubAllEnvs();
  findMany.mockReset();
});

describe("inactivity email eligibility and templates", () => {
  it("renders normalized breaks while escaping all other HTML", () => {
    const values = { name: "<Ada>", appUrl: "https://example.com" };
    expect(renderInactivityEmailText("line1\n\nline2", values)).toBe(
      "line1<br><br>line2",
    );
    expect(renderInactivityEmailText("line1\r\nline2", values)).toBe(
      "line1<br>line2",
    );
    expect(renderInactivityEmailText("<b>{name}</b><br>ok", values)).toBe(
      "&lt;b&gt;&lt;Ada&gt;&lt;/b&gt;<br>ok",
    );
  });
  it("uses only the first name", () => {
    expect(inactivityEmailFirstName("Maria Silva")).toBe("Maria");
    expect(inactivityEmailFirstName("  ")).toBeNull();
    expect(inactivityEmailFirstName(null)).toBeNull();
  });
  it.each([
    [InactivityEmailKind.SEVEN_DAY, Locale.pt, "Oi!"],
    [InactivityEmailKind.SEVEN_DAY, Locale.en, "Hi,"],
    [InactivityEmailKind.SEVEN_DAY, Locale.fr, "Bonjour,"],
    [InactivityEmailKind.SEVEN_DAY, Locale.es, "Hola:"],
    [InactivityEmailKind.THIRTY_DAY, Locale.pt, "Oi!"],
    [InactivityEmailKind.THIRTY_DAY, Locale.en, "Hi,"],
    [InactivityEmailKind.THIRTY_DAY, Locale.fr, "Bonjour,"],
    [InactivityEmailKind.THIRTY_DAY, Locale.es, "Hola:"],
  ])("omits a missing name from %s %s templates", (kind, locale, greeting) => {
    const template = defaultInactivityTemplate(kind, locale);
    const body = renderInactivityEmailText(template.body, {
      name: null,
      appUrl: "https://example.com/dashboard",
    });
    expect(body.startsWith(greeting)).toBe(true);
    expect(body).not.toContain("{name}");
    expect(body).not.toMatch(/, !| ,/);
  });
  it("renders an escaped CTA inside the email-safe button cell", () => {
    expect(
      renderInactivityEmailCta(
        "Return <now>",
        'https://example.com/dashboard?next="today"',
      ),
    ).toContain(
      '<td bgcolor="#6D28D9" style="background-color:#6D28D9;border-radius:8px;padding:12px 18px;"><a href="https://example.com/dashboard?next=&quot;today&quot;" style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;mso-line-height-rule:exactly;color:#ffffff;font-weight:600;text-decoration:none;">Return &lt;now&gt;</a>',
    );
  });
  it("requires a live redeemed access code", () => {
    const now = new Date("2026-11-16T12:00:00Z");
    const base = {
      isBlocked: false,
      isAdmin: false,
      inactivityEmailsUnsubscribedAt: null,
      lastActiveAt: now,
    };
    expect(isEligibleForInactivityEmail(base)).toBe(false);
    expect(
      isEligibleForInactivityEmail({
        ...base,
        redeemedAccessCodes: [{ id: "lifetime" }],
      }),
    ).toBe(true);
  });
  it("excludes blocked, admin, unsubscribed, and never-active users", () => {
    const active = {
      isBlocked: false,
      isAdmin: false,
      inactivityEmailsUnsubscribedAt: null,
      redeemedAccessCodes: [{ id: "live-code" }],
      lastActiveAt: new Date(),
    };
    expect(isEligibleForInactivityEmail(active)).toBe(true);
    expect(isEligibleForInactivityEmail({ ...active, isBlocked: true })).toBe(
      false,
    );
    expect(isEligibleForInactivityEmail({ ...active, isAdmin: true })).toBe(
      false,
    );
    expect(
      isEligibleForInactivityEmail({
        ...active,
        inactivityEmailsUnsubscribedAt: new Date(),
      }),
    ).toBe(false);
    expect(
      isEligibleForInactivityEmail({ ...active, lastActiveAt: null }),
    ).toBe(false);
  });

  it("accepts only documented template tokens", () => {
    expect(validateInactivityTemplate("Hi {name}", "Open {appUrl}")).toBeNull();
    expect(validateInactivityTemplate("Open {appUrl}", "Body")).toContain(
      "body only",
    );
    expect(validateInactivityTemplate("Hello {email}", "Body")).toContain(
      "isn’t available",
    );
  });

  it("signs tokens, rejects tampering, and accepts a repeated valid token", () => {
    vi.stubEnv("INACTIVITY_EMAIL_UNSUBSCRIBE_SECRET", "a-long-test-secret");
    const token = signInactivityUnsubscribeToken("user_1", Locale.fr);
    expect(verifyInactivityUnsubscribeToken(token)).toEqual({
      userId: "user_1",
      locale: Locale.fr,
    });
    expect(verifyInactivityUnsubscribeToken(`${token}x`)).toBeNull();
    expect(verifyInactivityUnsubscribeToken(token)).toEqual({
      userId: "user_1",
      locale: Locale.fr,
    });
  });
});

describe("inactivity email selection", () => {
  it("skips learners without a live code", async () => {
    const now = new Date("2026-11-16T12:00:00Z");
    const inactive = new Date("2026-10-01T12:00:00Z");
    const row = (id: string, hasLiveCode: boolean) => ({
      id,
      email: `${id}@example.com`,
      name: null,
      locale: Locale.en,
      lastActiveAt: inactive,
      isBlocked: false,
      isAdmin: false,
      inactivityEmailsUnsubscribedAt: null,
      redeemedAccessCodes: hasLiveCode ? [{ id: "live-code" }] : [],
      inactivityEmailSends: [],
    });
    findMany.mockResolvedValue([
      row("no-evidence", false),
      row("eligible", true),
    ]);
    await expect(selectInactivityEmailCandidates(now)).resolves.toMatchObject([
      { id: "eligible" },
    ]);
    expect(findMany).toHaveBeenCalledWith(
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
  });
  it("selects only the 30-day email for a first rollout user and resets a later 30-day milestone after activity", async () => {
    const now = new Date("2026-11-16T12:00:00Z");
    const old = new Date("2026-10-01T12:00:00Z");
    const returned = new Date("2026-10-10T12:00:00Z");
    findMany.mockResolvedValue([
      {
        id: "first",
        email: "first@example.com",
        name: null,
        locale: Locale.en,
        lastActiveAt: old,
        isBlocked: false,
        isAdmin: false,
        inactivityEmailsUnsubscribedAt: null,
        redeemedAccessCodes: [{ id: "live-code" }],
        inactivityEmailSends: [],
      },
      {
        id: "returned",
        email: "returned@example.com",
        name: null,
        locale: Locale.en,
        lastActiveAt: returned,
        isBlocked: false,
        isAdmin: false,
        inactivityEmailsUnsubscribedAt: null,
        redeemedAccessCodes: [{ id: "live-code" }],
        inactivityEmailSends: [
          {
            id: "send_7",
            kind: InactivityEmailKind.SEVEN_DAY,
            lastActiveAt: old,
            status: InactivityEmailSendStatus.SENT,
            attempts: 1,
          },
        ],
      },
      {
        id: "duplicate",
        email: "duplicate@example.com",
        name: null,
        locale: Locale.en,
        lastActiveAt: old,
        isBlocked: false,
        isAdmin: false,
        inactivityEmailsUnsubscribedAt: null,
        redeemedAccessCodes: [{ id: "live-code" }],
        inactivityEmailSends: [
          {
            id: "send_30",
            kind: InactivityEmailKind.THIRTY_DAY,
            lastActiveAt: old,
            status: InactivityEmailSendStatus.SENT,
            attempts: 1,
          },
        ],
      },
    ]);
    const selected = await selectInactivityEmailCandidates(now);
    expect(selected.map((item) => [item.id, item.kind])).toEqual([
      ["first", InactivityEmailKind.THIRTY_DAY],
      ["returned", InactivityEmailKind.THIRTY_DAY],
    ]);
  });

  it("caps selection and retries only failed sends below three attempts", async () => {
    const now = new Date("2026-11-16T12:00:00Z");
    const old = new Date("2026-10-01T12:00:00Z");
    const user = (id: string, inactivityEmailSends: unknown[] = []) => ({
      id,
      email: `${id}@example.com`,
      name: null,
      locale: Locale.en,
      lastActiveAt: old,
      isBlocked: false,
      isAdmin: false,
      inactivityEmailsUnsubscribedAt: null,
      redeemedAccessCodes: [{ id: "live-code" }],
      inactivityEmailSends,
    });
    findMany.mockResolvedValue([
      user("retry", [
        {
          id: "failed",
          kind: InactivityEmailKind.THIRTY_DAY,
          lastActiveAt: old,
          status: InactivityEmailSendStatus.FAILED,
          attempts: 2,
        },
      ]),
      user("exhausted", [
        {
          id: "exhausted",
          kind: InactivityEmailKind.THIRTY_DAY,
          lastActiveAt: old,
          status: InactivityEmailSendStatus.FAILED,
          attempts: 3,
        },
      ]),
      user("pending", [
        {
          id: "pending",
          kind: InactivityEmailKind.THIRTY_DAY,
          lastActiveAt: old,
          status: InactivityEmailSendStatus.PENDING,
          attempts: 1,
        },
      ]),
      ...Array.from({ length: 100 }, (_, index) => user(`user-${index}`)),
    ]);
    const selected = await selectInactivityEmailCandidates(now);
    expect(selected).toHaveLength(90);
    expect(selected[0]).toMatchObject({ id: "retry", retrySendId: "failed" });
    expect(selected.map((item) => item.id)).not.toContain("exhausted");
    expect(selected.map((item) => item.id)).not.toContain("pending");
  });
});
