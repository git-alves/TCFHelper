import { beforeEach, describe, expect, it, vi } from "vitest";

const { countMock, eventFindManyMock, formatMessageMock, userFindManyMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  eventFindManyMock: vi.fn(),
  formatMessageMock: vi.fn(),
  userFindManyMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminEvent: {
      count: countMock,
      findMany: eventFindManyMock,
    },
    user: {
      findMany: userFindManyMock,
    },
  },
}));
vi.mock("@/lib/admin-events", () => ({
  ADMIN_EVENT_SEVERITIES: ["INFO", "WARN", "ERROR"],
  ADMIN_EVENT_MODULES: ["ESSAY_SERVICE", "QUOTA_ACCESS", "AUTH_SECURITY", "SYSTEM_INTEGRATION"],
  ADMIN_EVENT_BROWSER_FAMILIES: [
    "Chrome",
    "Edge",
    "Firefox",
    "Safari",
    "Opera",
    "Samsung Internet",
    "Other browser",
  ],
  ADMIN_EVENT_DEVICE_CLASSES: ["Desktop", "Mobile", "Tablet", "Other device"],
  ADMIN_EVENT_NETWORK_UNAVAILABLE: "Unavailable",
  ADMIN_EVENT_TYPES: [
    "ACCESS_CODE_REDEEMED",
    "ACCESS_CODE_REJECTED",
    "TRANSLATION_QUOTA_DENIED",
    "EXAMPLE_QUOTA_DENIED",
    "CORRECTION_QUOTA_DENIED",
    "CORRECTION_PROVIDER_FAILED",
    "EXAMPLE_PROVIDER_FAILED",
    "TRANSLATION_PROVIDER_FAILED",
    "AUTH_SESSION_CREATED",
    "AUTH_NETWORK_REVIEW_REQUIRED",
  ],
  ADMIN_EVENT_REASON_CODES: [
    "invalid_or_spent",
    "minute_request_limit",
    "minute_character_limit",
    "monthly_character_limit",
    "daily_limit",
    "cooldown",
    "not_configured",
    "rate_limited",
    "transport_error",
    "upstream_http_error",
    "invalid_response",
    "fallback_circuit_open",
    "provider_unavailable",
  ],
  ADMIN_EVENT_PROVIDERS: ["gemini", "deepl", "unofficial", "deepl_or_unofficial"],
  ADMIN_EVENT_QUOTA_WINDOWS: ["minute", "day", "month"],
  getAdminEventRetentionCutoff: (now: Date) => new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000),
  formatAdminEventMessage: formatMessageMock,
}));

const {
  ADMIN_EVENT_LOG_MAX_EMAIL_CANDIDATES,
  ADMIN_EVENT_LOG_MAX_CUSTOM_RANGE_DAYS,
  AdminEventLogQueryError,
  AdminEventLogSearchTooBroadError,
  adminEventLogHref,
  adminEventLogSearchParamsFromUrl,
  getAdminEventLogPage,
  parseAdminEventLogQuery,
} = await import("./admin-event-log");

const NOW = new Date("2026-08-11T12:34:56.789Z");

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: "event_1",
    occurredAt: new Date("2026-08-11T11:00:00.000Z"),
    firstOccurredAt: new Date("2026-08-11T10:00:00.000Z"),
    severity: "WARN",
    module: "QUOTA_ACCESS",
    eventType: "TRANSLATION_QUOTA_DENIED",
    userId: "user_1",
    essayId: null,
    accessCodeId: null,
    provider: null,
    reasonCode: "minute_request_limit",
    httpStatus: null,
    quotaWindow: "minute",
    usageValue: 10,
    quotaLimit: 10,
    maskedIp: null,
    browserFamily: null,
    deviceClass: null,
    distinctIpCount: null,
    securityWindowMinutes: null,
    occurrenceCount: 2,
    ...overrides,
  };
}

beforeEach(() => {
  countMock.mockReset();
  eventFindManyMock.mockReset();
  formatMessageMock.mockReset();
  userFindManyMock.mockReset();
  countMock.mockResolvedValue(0);
  eventFindManyMock.mockResolvedValue([]);
  formatMessageMock.mockReturnValue("Safe operational message.");
  userFindManyMock.mockResolvedValue([]);
});

describe("parseAdminEventLogQuery", () => {
  it("uses the documented UTC preset boundaries ending at query time", () => {
    expect(parseAdminEventLogQuery({ range: "today" }, NOW)).toMatchObject({
      start: new Date("2026-08-11T00:00:00.000Z"),
      end: NOW,
    });
    expect(parseAdminEventLogQuery({ range: "last-7-days" }, NOW)).toMatchObject({
      start: new Date("2026-08-04T12:34:56.789Z"),
      end: NOW,
    });
    expect(parseAdminEventLogQuery({ range: "current-month" }, NOW)).toMatchObject({
      start: new Date("2026-08-01T00:00:00.000Z"),
      end: NOW,
    });
  });

  it("accepts a positive, end-exclusive custom UTC interval and canonicalizes it", () => {
    const query = parseAdminEventLogQuery(
      {
        range: "custom",
        from: "2026-08-10T10:00",
        to: "2026-08-11T10:00:00Z",
        severity: "WARN",
        module: "QUOTA_ACCESS",
        q: "  learner@example.com  ",
        page: "2",
        limit: "50",
      },
      NOW,
    );

    expect(query).toMatchObject({
      from: "2026-08-10T10:00:00.000Z",
      to: "2026-08-11T10:00:00.000Z",
      start: new Date("2026-08-10T10:00:00.000Z"),
      end: new Date("2026-08-11T10:00:00.000Z"),
      severity: "WARN",
      module: "QUOTA_ACCESS",
      q: "learner@example.com",
      page: 2,
      limit: 50,
    });
  });

  it("rejects invalid, duplicate, unknown, future, expired, and oversized custom parameters", () => {
    const invalid = (input: Parameters<typeof parseAdminEventLogQuery>[0]) =>
      expect(() => parseAdminEventLogQuery(input, NOW)).toThrow(AdminEventLogQueryError);

    invalid({ range: ["today", "custom"] });
    invalid({ range: "today", q: "x".repeat(121) });
    invalid({ range: "custom", from: "2026-08-10T10:00Z", to: "2026-08-10T10:00Z" });
    invalid({ range: "custom", from: "2026-08-10T10:00Z", to: "2026-08-11T13:00Z" });
    invalid({ range: "custom", from: "2026-07-10T12:34:56.789Z", to: "2026-07-11T12:34:56.789Z" });
    invalid({ range: "custom", from: "2026-07-12T12:34:56.789Z", to: "2026-08-11T12:34:56.790Z" });
    invalid({ range: "custom", from: "2026-08-10T10:00+02:00", to: "2026-08-10T11:00+02:00" });
    invalid({ range: "today", page: "0" });
    invalid({ range: "today", limit: "25" });
    invalid({ range: "today", severity: "debug" });
    invalid({ range: "today", module: "billing" });
    invalid({ range: "today", extra: "not allowed" } as Parameters<typeof parseAdminEventLogQuery>[0]);

    const duplicateUrl = adminEventLogSearchParamsFromUrl(new URLSearchParams("range=today&range=custom"));
    invalid(duplicateUrl);
    expect(() => adminEventLogSearchParamsFromUrl(new URLSearchParams("range=today&debug=true"))).toThrow(
      AdminEventLogQueryError,
    );
  });

  it("allows only the three approved page sizes", () => {
    expect(ADMIN_EVENT_LOG_MAX_CUSTOM_RANGE_DAYS).toBe(30);
    expect(parseAdminEventLogQuery({ limit: "20" }, NOW).limit).toBe(20);
    expect(parseAdminEventLogQuery({ limit: "50" }, NOW).limit).toBe(50);
    expect(parseAdminEventLogQuery({ limit: "100" }, NOW).limit).toBe(100);
    expect(() => parseAdminEventLogQuery({ limit: "020" }, NOW)).toThrow(AdminEventLogQueryError);
  });
});

describe("getAdminEventLogPage", () => {
  it("applies the rolling retention cutoff in the database where clause", async () => {
    const now = new Date("2026-08-31T12:00:00.000Z");
    const query = parseAdminEventLogQuery({ range: "current-month" }, now);

    await getAdminEventLogPage(query, now);

    expect(countMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        occurredAt: {
          gte: new Date("2026-08-01T12:00:00.000Z"),
          lt: now,
        },
      }),
    });
  });

  it("matches a current user email through its local user id without returning searchText", async () => {
    userFindManyMock.mockResolvedValue([{ id: "user_by_email" }]);
    countMock.mockResolvedValue(1);
    eventFindManyMock.mockResolvedValue([record({ searchText: "never expose this" })]);
    const query = parseAdminEventLogQuery({ range: "today", q: "learner@example.com" }, NOW);

    const page = await getAdminEventLogPage(query, NOW);

    expect(userFindManyMock).toHaveBeenCalledWith({
      where: { email: { contains: "learner@example.com", mode: "insensitive" } },
      select: { id: true },
      take: ADMIN_EVENT_LOG_MAX_EMAIL_CANDIDATES + 1,
    });
    expect(countMock.mock.calls[0][0].where.OR).toContainEqual({ userId: { in: ["user_by_email"] } });
    expect(eventFindManyMock.mock.calls[0][0].select).not.toHaveProperty("searchText");
    expect(page.events[0]).not.toHaveProperty("searchText");
    expect(JSON.stringify(page.events[0])).not.toContain("never expose this");
    expect(formatMessageMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "TRANSLATION_QUOTA_DENIED" }));
  });

  it("redacts malformed persisted values before they can reach the API response", async () => {
    countMock.mockResolvedValue(1);
    eventFindManyMock.mockResolvedValue([
      record({
        id: "raw-event-id-and-provider-secret",
        severity: "RAW SEVERITY",
        module: "RAW MODULE",
        eventType: "RAW EVENT TYPE: learner draft",
        userId: "raw-user@example.com",
        essayId: "raw essay text",
        accessCodeId: "TCF-PRO-2026",
        provider: "https://provider.example/secret",
        reasonCode: "raw upstream exception",
        httpStatus: 999,
        quotaWindow: "forever",
        usageValue: -1,
        quotaLimit: 0,
        occurrenceCount: 0,
      }),
    ]);

    const page = await getAdminEventLogPage(parseAdminEventLogQuery({ range: "today" }, NOW), NOW);
    const event = page.events[0];

    expect(event).toMatchObject({
      id: "unknown-event",
      severity: "UNKNOWN",
      module: "UNKNOWN",
      eventType: "UNKNOWN_EVENT",
      userId: null,
      essayId: null,
      accessCodeId: null,
      provider: null,
      reasonCode: null,
      httpStatus: null,
      quotaWindow: null,
      usageValue: null,
      quotaLimit: null,
      occurrenceCount: 1,
    });
    expect(JSON.stringify(event)).not.toContain("raw");
    expect(JSON.stringify(event)).not.toContain("TCF-PRO-2026");
    expect(formatMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "UNKNOWN_EVENT", provider: null, reasonCode: null }),
    );
  });

  it("returns only the safe authentication summary, never fingerprint or raw network data", async () => {
    countMock.mockResolvedValue(1);
    eventFindManyMock.mockResolvedValue([
      record({
        id: "c123456789012345678901234",
        severity: "INFO",
        module: "AUTH_SECURITY",
        eventType: "AUTH_SESSION_CREATED",
        userId: "c123456789012345678901234",
        reasonCode: null,
        httpStatus: null,
        quotaWindow: null,
        usageValue: null,
        quotaLimit: null,
        maskedIp: "203.0.113.*",
        browserFamily: "Chrome",
        deviceClass: "Desktop",
        distinctIpCount: null,
        securityWindowMinutes: null,
        searchText: "authentication sign in session started",
        ipFingerprint: "v1:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        sessionFingerprint: "v1:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      }),
    ]);

    const page = await getAdminEventLogPage(
      parseAdminEventLogQuery({ range: "today", module: "AUTH_SECURITY" }, NOW),
      NOW,
    );

    expect(eventFindManyMock.mock.calls[0]?.[0].select).toMatchObject({
      maskedIp: true,
      browserFamily: true,
      deviceClass: true,
    });
    expect(eventFindManyMock.mock.calls[0]?.[0].select).not.toHaveProperty("ipFingerprint");
    expect(eventFindManyMock.mock.calls[0]?.[0].select).not.toHaveProperty("sessionFingerprint");
    expect(page.events[0]).toMatchObject({
      maskedIp: "203.0.113.*",
      browserFamily: "Chrome",
      deviceClass: "Desktop",
    });
    expect(JSON.stringify(page.events[0])).not.toContain("203.0.113.9");
    expect(JSON.stringify(page.events[0])).not.toContain("v1:");
    expect(JSON.stringify(page.events[0])).not.toContain("sessionFingerprint");
  });

  it("rejects an email fragment with too many candidates instead of silently dropping matches", async () => {
    userFindManyMock.mockResolvedValue(
      Array.from({ length: ADMIN_EVENT_LOG_MAX_EMAIL_CANDIDATES + 1 }, (_, index) => ({ id: `user_${index}` })),
    );
    const query = parseAdminEventLogQuery({ range: "today", q: "a" }, NOW);

    await expect(getAdminEventLogPage(query, NOW)).rejects.toThrow(AdminEventLogSearchTooBroadError);
    expect(userFindManyMock).toHaveBeenCalledWith({
      where: { email: { contains: "a", mode: "insensitive" } },
      select: { id: true },
      take: ADMIN_EVENT_LOG_MAX_EMAIL_CANDIDATES + 1,
    });
    expect(countMock).not.toHaveBeenCalled();
    expect(eventFindManyMock).not.toHaveBeenCalled();
  });

  it("uses deterministic descending order and clamps pagination before querying the selected page", async () => {
    countMock.mockResolvedValue(51);
    const query = parseAdminEventLogQuery({ range: "today", page: "99", limit: "20" }, NOW);

    const page = await getAdminEventLogPage(query, NOW);

    expect(page).toMatchObject({ total: 51, page: 3, pageCount: 3 });
    expect(eventFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
        skip: 40,
        take: 20,
      }),
    );
  });

  it("keeps every filter in URL-backed pagination links", () => {
    expect(
      adminEventLogHref(
        {
          range: "custom",
          from: "2026-08-10T10:00:00.000Z",
          to: "2026-08-11T10:00:00.000Z",
          severity: "ERROR",
          module: "ESSAY_SERVICE",
          q: "gemini",
          page: 2,
          limit: 100,
        },
        3,
      ),
    ).toBe(
      "/admin/logs?range=custom&severity=ERROR&module=ESSAY_SERVICE&page=3&limit=100&q=gemini&from=2026-08-10T10%3A00%3A00.000Z&to=2026-08-11T10%3A00%3A00.000Z",
    );
  });
});
