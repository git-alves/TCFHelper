import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  transactionMock,
  userFindUniqueMock,
  sessionFindUniqueMock,
  sessionCreateMock,
  sessionFindManyMock,
  sessionFindFirstMock,
  sessionUpdateMock,
  executeRawMock,
  recordAdminEventInTransactionMock,
  syncClerkUserFromWebhookMock,
} = vi.hoisted(() => ({
  transactionMock: vi.fn(),
  userFindUniqueMock: vi.fn(),
  sessionFindUniqueMock: vi.fn(),
  sessionCreateMock: vi.fn(),
  sessionFindManyMock: vi.fn(),
  sessionFindFirstMock: vi.fn(),
  sessionUpdateMock: vi.fn(),
  executeRawMock: vi.fn(),
  recordAdminEventInTransactionMock: vi.fn(),
  syncClerkUserFromWebhookMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transactionMock } }));
vi.mock("@/lib/admin-events", () => ({
  ADMIN_EVENT_NETWORK_UNAVAILABLE: "Unavailable",
  ADMIN_EVENT_RETENTION_DAYS: 30,
  recordAdminEventInTransaction: recordAdminEventInTransactionMock,
}));
vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: class AppUserProvisioningError extends Error {},
  syncClerkUserFromWebhook: syncClerkUserFromWebhookMock,
}));

const {
  AUTH_SECURITY_REVIEW_WINDOW_MS,
  AuthSecurityConfigurationError,
  deriveBrowserFamily,
  deriveDeviceClass,
  deriveMaskedNetwork,
  findReviewWindow,
  parseSessionOccurredAt,
  recordAuthSecuritySession,
} = await import("./auth-security");

const USER_ID = "c123456789012345678901234";
const NOW = new Date("2026-08-11T12:00:00.000Z");

let createdSessionData: Record<string, unknown> | undefined;

function sessionInput(overrides: Record<string, unknown> = {}) {
  return {
    clerkUserId: "user_clerk_1",
    clerkSessionId: "sess_clerk_1",
    occurredAt: NOW.getTime(),
    clientIp: "203.0.113.9",
    browserName: "Chrome",
    deviceType: "desktop",
    isMobile: false,
    actor: null,
    embeddedUser: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("SECURITY_TELEMETRY_HMAC_SECRET", "x".repeat(32));
  createdSessionData = undefined;
  transactionMock.mockReset();
  userFindUniqueMock.mockReset();
  sessionFindUniqueMock.mockReset();
  sessionCreateMock.mockReset();
  sessionFindManyMock.mockReset();
  sessionFindFirstMock.mockReset();
  sessionUpdateMock.mockReset();
  executeRawMock.mockReset();
  recordAdminEventInTransactionMock.mockReset();
  syncClerkUserFromWebhookMock.mockReset();

  userFindUniqueMock.mockResolvedValue({ id: USER_ID });
  sessionFindUniqueMock.mockResolvedValue(null);
  sessionCreateMock.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
    createdSessionData = data;
    return { id: "c234567890123456789012345" };
  });
  sessionFindManyMock.mockResolvedValue([]);
  sessionFindFirstMock.mockResolvedValue(null);
  sessionUpdateMock.mockResolvedValue({ id: "c234567890123456789012345" });
  executeRawMock.mockResolvedValue(undefined);
  recordAdminEventInTransactionMock.mockResolvedValue(undefined);
  transactionMock.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      user: { findUnique: userFindUniqueMock },
      authSecuritySession: {
        findUnique: sessionFindUniqueMock,
        create: sessionCreateMock,
        findMany: sessionFindManyMock,
        findFirst: sessionFindFirstMock,
        update: sessionUpdateMock,
      },
      adminEvent: {},
      $executeRaw: executeRawMock,
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("privacy-preserving session metadata", () => {
  it("masks IPv4/IPv6 values and canonicalizes IPv4-mapped IPv6 before HMACing", () => {
    const ipv4 = deriveMaskedNetwork("203.0.113.9");
    const mapped = deriveMaskedNetwork("::ffff:203.0.113.9");
    const ipv6 = deriveMaskedNetwork("2001:0db8:abcd:0000:0000:0000:0000:0001");

    expect(ipv4.maskedIp).toBe("203.0.113.*");
    expect(ipv6.maskedIp).toBe("2001:db8:abcd::/48");
    expect(mapped.ipFingerprint).toBe(ipv4.ipFingerprint);
    expect(ipv4.ipFingerprint).toMatch(/^v1:[a-f0-9]{64}$/);
    expect(JSON.stringify(ipv4)).not.toContain("203.0.113.9");
  });

  it.each([
    "203.0.113.9:443",
    "[2001:db8::1]",
    "fe80::1%eth0",
    "203.0.113.9, 198.51.100.1",
    " 203.0.113.9",
    undefined,
  ])("does not derive a shared fingerprint from invalid or absent network input", (input) => {
    expect(deriveMaskedNetwork(input)).toEqual({ maskedIp: "Unavailable", ipFingerprint: null });
  });

  it("maps only closed coarse browser and device labels", () => {
    expect(deriveBrowserFamily("Chrome 123.0 with arbitrary agent tail")).toBe("Chrome");
    expect(deriveBrowserFamily("unrecognized browser value")).toBe("Other browser");
    expect(deriveDeviceClass("desktop", false)).toBe("Desktop");
    expect(deriveDeviceClass("anything", true)).toBe("Mobile");
    expect(deriveDeviceClass(undefined, false)).toBe("Other device");
  });

  it("accepts only in-retention source session timestamps", () => {
    expect(parseSessionOccurredAt(NOW.getTime(), NOW)).toEqual(NOW);
    expect(parseSessionOccurredAt(NOW.getTime() + 5 * 60_000 + 1, NOW)).toBeNull();
    expect(parseSessionOccurredAt(NOW.getTime() - 30 * 24 * 60 * 60 * 1_000 - 1, NOW)).toBeNull();
    expect(parseSessionOccurredAt("not a timestamp", NOW)).toBeNull();
  });

  it("fails closed without a distinct strong HMAC secret", async () => {
    vi.stubEnv("SECURITY_TELEMETRY_HMAC_SECRET", "too-short");

    await expect(recordAuthSecuritySession(sessionInput(), NOW)).rejects.toBeInstanceOf(AuthSecurityConfigurationError);
    expect(transactionMock).not.toHaveBeenCalled();
  });
});

describe("review-only sharing signal", () => {
  it("finds three distinct addresses in a rolling source-time window, including an out-of-order current session", () => {
    const start = NOW.getTime();
    const sessions = [
      { id: "a", occurredAt: new Date(start), sessionFingerprint: "session-a", ipFingerprint: "ip-a" },
      { id: "b", occurredAt: new Date(start + 8 * 60_000), sessionFingerprint: "session-b", ipFingerprint: "ip-b" },
      { id: "c", occurredAt: new Date(start + 4 * 60_000), sessionFingerprint: "session-c", ipFingerprint: "ip-c" },
    ];

    expect(findReviewWindow(sessions, "session-c")).toEqual({ startedAt: new Date(start), distinctIpCount: 3 });
  });

  it("does not flag the same address, two addresses, or an expired rolling window", () => {
    const start = NOW.getTime();
    expect(
      findReviewWindow(
        [
          { id: "a", occurredAt: new Date(start), sessionFingerprint: "a", ipFingerprint: "same" },
          { id: "b", occurredAt: new Date(start + 1_000), sessionFingerprint: "b", ipFingerprint: "same" },
          { id: "c", occurredAt: new Date(start + 2_000), sessionFingerprint: "c", ipFingerprint: "other" },
        ],
        "c",
      ),
    ).toBeNull();
    expect(
      findReviewWindow(
        [
          { id: "a", occurredAt: new Date(start), sessionFingerprint: "a", ipFingerprint: "one" },
          { id: "b", occurredAt: new Date(start + AUTH_SECURITY_REVIEW_WINDOW_MS + 1), sessionFingerprint: "b", ipFingerprint: "two" },
          { id: "c", occurredAt: new Date(start + AUTH_SECURITY_REVIEW_WINDOW_MS + 2), sessionFingerprint: "c", ipFingerprint: "three" },
        ],
        "c",
      ),
    ).toBeNull();
  });

  it("writes a single safe session row and a review warning atomically", async () => {
    sessionFindManyMock.mockImplementation(async () => [
      { id: "a", occurredAt: new Date(NOW.getTime() - 8 * 60_000), sessionFingerprint: "session-a", ipFingerprint: "ip-a" },
      { id: "b", occurredAt: new Date(NOW.getTime() - 4 * 60_000), sessionFingerprint: "session-b", ipFingerprint: "ip-b" },
      {
        id: "c234567890123456789012345",
        occurredAt: NOW,
        sessionFingerprint: createdSessionData?.sessionFingerprint,
        ipFingerprint: createdSessionData?.ipFingerprint,
      },
    ]);

    await expect(recordAuthSecuritySession(sessionInput(), NOW)).resolves.toEqual({ kind: "recorded", alerted: true });

    expect(executeRawMock.mock.calls[0]?.[0]?.join("")).toContain("pg_advisory_xact_lock");
    expect(createdSessionData).toMatchObject({ userId: USER_ID, occurredAt: NOW });
    expect(createdSessionData).not.toHaveProperty("clientIp");
    expect(createdSessionData).not.toHaveProperty("userAgent");
    expect(JSON.stringify(createdSessionData)).not.toContain("203.0.113.9");
    expect(recordAdminEventInTransactionMock).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        eventType: "AUTH_SESSION_CREATED",
        userId: USER_ID,
        maskedIp: "203.0.113.*",
        browserFamily: "Chrome",
        deviceClass: "Desktop",
      }),
      NOW,
    );
    expect(recordAdminEventInTransactionMock).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({
        eventType: "AUTH_NETWORK_REVIEW_REQUIRED",
        userId: USER_ID,
        distinctIpCount: 3,
        securityWindowMinutes: 10,
      }),
      NOW,
      { dedupeKey: expect.stringMatching(/^[a-f0-9]{64}$/) },
    );
    expect(JSON.stringify(recordAdminEventInTransactionMock.mock.calls)).not.toContain("sessionFingerprint");
    expect(JSON.stringify(recordAdminEventInTransactionMock.mock.calls)).not.toContain("203.0.113.9");
  });

  it("deduplicates Clerk sessions by the HMACed session identifier", async () => {
    sessionFindUniqueMock.mockResolvedValue({ id: "c234567890123456789012345" });

    await expect(recordAuthSecuritySession(sessionInput(), NOW)).resolves.toEqual({ kind: "duplicate" });

    expect(sessionCreateMock).not.toHaveBeenCalled();
    expect(recordAdminEventInTransactionMock).not.toHaveBeenCalled();
  });

  it("records unavailable network safely but never uses it in a review signal", async () => {
    await expect(recordAuthSecuritySession(sessionInput({ clientIp: "[unsafe]" }), NOW)).resolves.toEqual({
      kind: "recorded",
      alerted: false,
    });

    expect(createdSessionData).toMatchObject({ ipFingerprint: null });
    expect(sessionFindManyMock).not.toHaveBeenCalled();
    expect(recordAdminEventInTransactionMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maskedIp: "Unavailable" }),
      NOW,
    );
  });

  it("acknowledges an unlinked or impersonated session without persisting telemetry", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    await expect(recordAuthSecuritySession(sessionInput(), NOW)).resolves.toEqual({ kind: "unlinked" });
    expect(sessionCreateMock).not.toHaveBeenCalled();

    transactionMock.mockClear();
    await expect(recordAuthSecuritySession(sessionInput({ actor: { sub: "support" } }), NOW)).resolves.toEqual({ kind: "ignored" });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("uses the signed embedded user only for a session/user ordering race", async () => {
    userFindUniqueMock.mockResolvedValue(null);
    syncClerkUserFromWebhookMock.mockResolvedValue({ id: USER_ID });

    await expect(
      recordAuthSecuritySession(sessionInput({ embeddedUser: { id: "user_clerk_1" } }), NOW),
    ).resolves.toEqual({ kind: "recorded", alerted: false });

    expect(syncClerkUserFromWebhookMock).toHaveBeenCalledWith(
      { id: "user_clerk_1" },
      expect.objectContaining({ authSecuritySession: expect.any(Object) }),
    );
  });

  it("fails closed when Clerk's embedded user does not match the session subject", async () => {
    userFindUniqueMock.mockResolvedValue(null);

    await expect(
      recordAuthSecuritySession(sessionInput({ embeddedUser: { id: "user_other" } }), NOW),
    ).resolves.toEqual({ kind: "unlinked" });

    expect(syncClerkUserFromWebhookMock).not.toHaveBeenCalled();
    expect(sessionCreateMock).not.toHaveBeenCalled();
  });
});
