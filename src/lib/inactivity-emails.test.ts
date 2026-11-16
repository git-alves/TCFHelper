import { afterEach, describe, expect, it, vi } from "vitest";
import {
  InactivityEmailKind,
  InactivityEmailSendStatus,
  Locale,
} from "@prisma/client";

const findMany = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany } } }));

const {
  isEligibleForInactivityEmail,
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
  it("excludes blocked, admin, unsubscribed, and never-active users", () => {
    const active = {
      isBlocked: false,
      isAdmin: false,
      inactivityEmailsUnsubscribedAt: null,
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
});
