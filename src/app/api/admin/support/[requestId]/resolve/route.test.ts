import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, resolveSupportRequestMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  resolveSupportRequestMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/support-resolution", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/support-resolution")>()),
  resolveSupportRequest: resolveSupportRequestMock,
}));

const { POST } = await import("./route");

function resolve(body: unknown, requestId = "req_1") {
  return POST(
    new Request(`http://localhost/api/admin/support/${requestId}/resolve`, {
      method: "POST",
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ requestId }) },
  );
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  resolveSupportRequestMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "cuid_owner" });
  resolveSupportRequestMock.mockResolvedValue({ kind: "resolved", ticketNumber: 42 });
});

describe("POST /api/admin/support/[requestId]/resolve", () => {
  it("answers 404, with no hint the endpoint exists, to anyone who is not the owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await resolve({ note: "Fixed." });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(resolveSupportRequestMock).not.toHaveBeenCalled();
  });

  it("resolves the request with the trimmed note and reports its ticket number", async () => {
    const response = await resolve({ note: "  Fixed the editor.  " });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ resolved: true, ticketNumber: 42 });
    expect(resolveSupportRequestMock).toHaveBeenCalledWith("req_1", "Fixed the editor.");
  });

  it.each([
    ["an empty body", undefined],
    ["an empty object", {}],
    ["a blank note", { note: "   " }],
  ])("resolves with no note for %s", async (_label, body) => {
    const response = await resolve(body);

    expect(response.status).toBe(200);
    expect(resolveSupportRequestMock).toHaveBeenCalledWith("req_1", null);
  });

  it("accepts a note of exactly 500 characters and rejects 501", async () => {
    expect((await resolve({ note: "a".repeat(500) })).status).toBe(200);

    resolveSupportRequestMock.mockClear();
    const tooLong = await resolve({ note: "a".repeat(501) });
    expect(tooLong.status).toBe(400);
    expect(resolveSupportRequestMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a non-string note", { note: 42 }],
    ["an unexpected field (status cannot be set from the client)", { note: "ok", status: "OPEN" }],
    ["invalid JSON", "not json"],
  ])("rejects %s with 400", async (_label, body) => {
    const response = await resolve(body);

    expect(response.status).toBe(400);
    expect(resolveSupportRequestMock).not.toHaveBeenCalled();
  });

  it("answers 404 for a request that does not exist", async () => {
    resolveSupportRequestMock.mockResolvedValue({ kind: "notFound" });

    expect((await resolve({ note: "x" }, "missing")).status).toBe(404);
  });

  it("answers 409 for a request that is already resolved: resolving is never repeated or undone here", async () => {
    resolveSupportRequestMock.mockResolvedValue({ kind: "alreadyResolved" });

    const response = await resolve({ note: "Fixed." });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: "SUPPORT_REQUEST_ALREADY_RESOLVED" });
  });
});
