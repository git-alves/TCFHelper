import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, recordSupportInboxVisitMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  recordSupportInboxVisitMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/support-inbox", () => ({ recordSupportInboxVisit: recordSupportInboxVisitMock }));

const { POST } = await import("./route");

function post(body?: unknown) {
  return POST(
    new Request("http://localhost/api/admin/support/inbox/seen", {
      method: "POST",
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const STORED = new Date("2026-11-12T09:30:00.000Z");

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  recordSupportInboxVisitMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "cuid_owner" });
  recordSupportInboxVisitMock.mockResolvedValue(STORED);
});

describe("POST /api/admin/support/inbox/seen", () => {
  it("answers 404 to anyone who is not the owner, and records nothing", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await post({ seenAt: STORED.toISOString() });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(recordSupportInboxVisitMock).not.toHaveBeenCalled();
  });

  it("records the visit at the render time the page handed back and returns the stored time", async () => {
    const response = await post({ seenAt: "2026-11-12T09:29:58.000Z" });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ seenAt: STORED.toISOString() });
    expect(recordSupportInboxVisitMock).toHaveBeenCalledWith("cuid_owner", new Date("2026-11-12T09:29:58.000Z"));
  });

  it.each([
    ["no body", undefined],
    ["an empty object", {}],
  ])("stamps the visit now (no requested time) for %s", async (_label, body) => {
    const response = await post(body);

    expect(response.status).toBe(200);
    expect(recordSupportInboxVisitMock).toHaveBeenCalledWith("cuid_owner", null);
  });

  it.each([
    ["a non-date string", { seenAt: "yesterday" }],
    ["a date with no time", { seenAt: "2026-11-12" }],
    ["a number", { seenAt: 1762939800000 }],
    ["null", { seenAt: null }],
    ["an unexpected field", { seenAt: "2026-11-12T09:29:58.000Z", userId: "someone_else" }],
    ["invalid JSON", "not json"],
  ])("rejects %s with 400 and records nothing", async (_label, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(recordSupportInboxVisitMock).not.toHaveBeenCalled();
  });

  it("is idempotent: repeating the same request gives the same answer", async () => {
    const first = await post({ seenAt: STORED.toISOString() });
    const second = await post({ seenAt: STORED.toISOString() });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await first.json()).toEqual(await second.json());
  });
});
