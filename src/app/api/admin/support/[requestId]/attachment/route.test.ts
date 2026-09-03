import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, findUniqueMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  findUniqueMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { supportRequest: { findUnique: findUniqueMock } },
}));

const { GET } = await import("./route");

function download(requestId = "cuid_support_request_1") {
  return GET(new Request(`http://localhost/api/admin/support/${requestId}/attachment`), {
    params: Promise.resolve({ requestId }),
  });
}

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  findUniqueMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "cuid_owner" });
});

describe("GET /api/admin/support/[requestId]/attachment", () => {
  it("does not disclose the attachment route to a non-owner", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await download();

    expect(response.status).toBe(404);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it("downloads a stored support attachment only for the owner", async () => {
    findUniqueMock.mockResolvedValue({
      attachment: {
        data: new Uint8Array([116, 101, 115, 116]),
        mimeType: "text/plain",
        originalName: "reproduction notes.txt",
      },
    });

    const response = await download("cuid_support_request_2");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Disposition")).toContain('filename="reproduction_notes.txt"');
    await expect(response.text()).resolves.toBe("test");
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: "cuid_support_request_2" },
      select: {
        attachment: {
          select: { data: true, mimeType: true, originalName: true },
        },
      },
    });
  });

  it("returns the same non-disclosing response when a request has no attachment", async () => {
    findUniqueMock.mockResolvedValue({ attachment: null });

    const response = await download();

    expect(response.status).toBe(404);
  });
});
