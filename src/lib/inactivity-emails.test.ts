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
  it("applies the 730-day implied-consent evidence window", () => {
    const now = new Date("2026-11-16T12:00:00Z");
    const base = {
      isBlocked: false,
      isAdmin: false,
      inactivityEmailsUnsubscribedAt: null,
      lastActiveAt: now,
    };
    const days = (count: number) =>
      new Date(now.getTime() - count * 86_400_000);
    expect(isEligibleForInactivityEmail(base, now)).toBe(false);
    for (const evidence of [
      { activationWelcomeShownAt: days(729) },
      { redeemedAccessCodes: [{ redeemedAt: days(729) }] },
      {
        subscriptions: [
          { status: "ACTIVE", createdAt: days(729), currentPeriodEnd: null },
        ],
      },
    ])
      expect(isEligibleForInactivityEmail({ ...base, ...evidence }, now)).toBe(
        true,
      );
    for (const evidence of [
      { activationWelcomeShownAt: days(731) },
      { redeemedAccessCodes: [{ redeemedAt: days(731) }] },
      {
        subscriptions: [
          { status: "ACTIVE", createdAt: days(731), currentPeriodEnd: null },
        ],
      },
    ])
      expect(isEligibleForInactivityEmail({ ...base, ...evidence }, now)).toBe(
        false,
      );
    for (const status of ["ACTIVE", "PAST_DUE", "CANCELED"])
      expect(
        isEligibleForInactivityEmail(
          {
            ...base,
            subscriptions: [
              { status, createdAt: days(729), currentPeriodEnd: null },
            ],
          },
          now,
        ),
      ).toBe(true);
    for (const status of [
      "TRIALING",
      "INCOMPLETE",
      "INCOMPLETE_EXPIRED",
      "UNPAID",
      "PAUSED",
    ])
      expect(
        isEligibleForInactivityEmail(
          {
            ...base,
            subscriptions: [
              { status, createdAt: days(729), currentPeriodEnd: null },
            ],
          },
          now,
        ),
      ).toBe(false);
    expect(
      isEligibleForInactivityEmail(
        {
          ...base,
          subscriptions: [
            {
              status: "ACTIVE",
              createdAt: days(1_095),
              currentPeriodEnd: new Date(now.getTime() + 86_400_000),
            },
          ],
        },
        now,
      ),
    ).toBe(true);
    expect(
      isEligibleForInactivityEmail(
        {
          ...base,
          subscriptions: [
            {
              status: "CANCELED",
              createdAt: days(1_095),
              currentPeriodEnd: days(365),
            },
          ],
        },
        now,
      ),
    ).toBe(true);
  });
  it("excludes blocked, admin, unsubscribed, and never-active users", () => {
    const active = {
      isBlocked: false,
      isAdmin: false,
      inactivityEmailsUnsubscribedAt: null,
      activationWelcomeShownAt: new Date("2026-10-17T12:00:00Z"),
      redeemedAccessCodes: [],
      subscriptions: [],
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
        activationWelcomeShownAt: new Date("2026-10-17T12:00:00Z"),
        redeemedAccessCodes: [],
        subscriptions: [],
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
        activationWelcomeShownAt: new Date("2026-10-17T12:00:00Z"),
        redeemedAccessCodes: [],
        subscriptions: [],
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
        activationWelcomeShownAt: new Date("2026-10-17T12:00:00Z"),
        redeemedAccessCodes: [],
        subscriptions: [],
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
      activationWelcomeShownAt: new Date("2026-10-17T12:00:00Z"),
      redeemedAccessCodes: [],
      subscriptions: [],
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
