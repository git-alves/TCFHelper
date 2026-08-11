import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  adminEventCountMock,
  adminEventFindManyMock,
  userFindManyMock,
  adminEventCreateMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  adminEventCountMock: vi.fn(),
  adminEventFindManyMock: vi.fn(),
  userFindManyMock: vi.fn(),
  adminEventCreateMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    adminEvent: { count: adminEventCountMock, findMany: adminEventFindManyMock },
    user: { findMany: userFindManyMock },
  },
}));
vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: class AppUserProvisioningError extends Error {},
  syncClerkUserFromWebhook: vi.fn(),
}));

const { recordAuthSecuritySession } = await import("./auth-security");
const { getAdminEventLogPage, parseAdminEventLogQuery } = await import("./admin-event-log");

const USER_ID = "c123456789012345678901234";

describe("verified session to owner-log contract", () => {
  const rows: Record<string, unknown>[] = [];

  beforeEach(() => {
    vi.stubEnv("SECURITY_TELEMETRY_HMAC_SECRET", "x".repeat(32));
    rows.length = 0;
    transactionMock.mockReset();
    adminEventCountMock.mockReset();
    adminEventFindManyMock.mockReset();
    userFindManyMock.mockReset();
    adminEventCreateMock.mockReset();

    adminEventCreateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      rows.push({ id: "c234567890123456789012345", occurrenceCount: 1, ...data });
      return { id: "c234567890123456789012345" };
    });
    transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: { findUnique: vi.fn().mockResolvedValue({ id: USER_ID }) },
        authSecuritySession: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "c345678901234567890123456" }),
          findMany: vi.fn().mockResolvedValue([]),
          findFirst: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
        adminEvent: { create: adminEventCreateMock, upsert: vi.fn() },
        $executeRaw: vi.fn(),
      }),
    );
    adminEventCountMock.mockImplementation(async () => rows.length);
    adminEventFindManyMock.mockImplementation(async () => rows);
    userFindManyMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("turns a verified new session into a masked, coarse Authentication log row only", async () => {
    const now = new Date();
    await expect(
      recordAuthSecuritySession(
        {
          clerkUserId: "user_clerk_1",
          clerkSessionId: "sess_clerk_1",
          occurredAt: now.getTime(),
          clientIp: "203.0.113.9",
          browserName: "Chrome",
          deviceType: "desktop",
          isMobile: false,
          actor: null,
          embeddedUser: null,
        },
        now,
      ),
    ).resolves.toEqual({ kind: "recorded", alerted: false });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      eventType: "AUTH_SESSION_CREATED",
      module: "AUTH_SECURITY",
      severity: "INFO",
      maskedIp: "203.0.113.*",
      browserFamily: "Chrome",
      deviceClass: "Desktop",
    });
    expect(JSON.stringify(rows[0])).not.toContain("203.0.113.9");
    expect(JSON.stringify(rows[0])).not.toContain("sess_clerk_1");

    const page = await getAdminEventLogPage(
      parseAdminEventLogQuery({ range: "today", module: "AUTH_SECURITY" }, now),
      now,
    );

    expect(page.events).toHaveLength(1);
    expect(page.events[0]).toMatchObject({
      eventType: "AUTH_SESSION_CREATED",
      maskedIp: "203.0.113.*",
      browserFamily: "Chrome",
      deviceClass: "Desktop",
    });
    expect(JSON.stringify(page.events[0])).not.toContain("203.0.113.9");
    expect(JSON.stringify(page.events[0])).not.toContain("sess_clerk_1");
    expect(JSON.stringify(page.events[0])).not.toContain("v1:");
  });
});
