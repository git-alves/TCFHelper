import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, getAppConfigDisplayMock, toAppConfigDisplayMock, updateAppConfigMock } = vi.hoisted(
  () => ({
    getAdminApiUserMock: vi.fn(),
    getAppConfigDisplayMock: vi.fn(),
    toAppConfigDisplayMock: vi.fn(),
    updateAppConfigMock: vi.fn(),
  }),
);

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/app-config", () => ({
  getAppConfigDisplay: getAppConfigDisplayMock,
  toAppConfigDisplay: toAppConfigDisplayMock,
  updateAppConfig: updateAppConfigMock,
}));

const { GET, PUT } = await import("./route");

const ADMIN = { id: "cuid_admin_1", isAdmin: true };
const DISPLAY = {
  correction: { apiKeySet: false, apiKeyMasked: null, apiKeyFromEnv: true, model: null, modelDefault: "gemini-3.5-flash-lite" },
  example: { apiKeySet: false, apiKeyMasked: null, apiKeyFromEnv: true, model: null, modelDefault: "gemini-3.5-flash" },
};

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  getAppConfigDisplayMock.mockReset();
  toAppConfigDisplayMock.mockReset();
  updateAppConfigMock.mockReset();
  getAdminApiUserMock.mockResolvedValue(ADMIN);
  getAppConfigDisplayMock.mockResolvedValue(DISPLAY);
});

describe("GET /api/admin/settings", () => {
  it("answers 404 for a non-admin caller", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(getAppConfigDisplayMock).not.toHaveBeenCalled();
  });

  it("returns the current display state for an admin", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(DISPLAY);
  });
});

describe("PUT /api/admin/settings", () => {
  it("answers 404 for a non-admin caller", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await PUT(new Request("http://localhost/api/admin/settings", { method: "PUT", body: "{}" }));

    expect(response.status).toBe(404);
    expect(updateAppConfigMock).not.toHaveBeenCalled();
  });

  it("rejects an unrecognized field", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ unexpectedField: "value" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(updateAppConfigMock).not.toHaveBeenCalled();
  });

  it("rejects a field that is too long", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ correctionApiKey: "x".repeat(501) }),
      }),
    );

    expect(response.status).toBe(400);
    expect(updateAppConfigMock).not.toHaveBeenCalled();
  });

  it("only forwards fields present in the request body", async () => {
    const updatedConfig = { correctionApiKey: "sk-new", correctionModel: null, exampleApiKey: null, exampleModel: null };
    updateAppConfigMock.mockResolvedValue(updatedConfig);
    toAppConfigDisplayMock.mockReturnValue(DISPLAY);

    const response = await PUT(
      new Request("http://localhost/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ correctionApiKey: "sk-new" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateAppConfigMock).toHaveBeenCalledWith({ correctionApiKey: "sk-new" });
    expect(toAppConfigDisplayMock).toHaveBeenCalledWith(updatedConfig);
    expect(body).toEqual(DISPLAY);
  });

  it("clears a field with an empty string", async () => {
    updateAppConfigMock.mockResolvedValue({});
    toAppConfigDisplayMock.mockReturnValue(DISPLAY);

    await PUT(
      new Request("http://localhost/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({ correctionApiKey: "" }),
      }),
    );

    expect(updateAppConfigMock).toHaveBeenCalledWith({ correctionApiKey: "" });
  });
});
