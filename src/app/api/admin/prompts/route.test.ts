import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, getPromptOverridesDisplayMock, updatePromptOverridesMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  getPromptOverridesDisplayMock: vi.fn(),
  updatePromptOverridesMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/prompt-overrides", () => ({
  PROMPT_OVERRIDE_KEYS: [
    "correctionBase",
    "correctionTask1",
    "correctionTask2",
    "correctionTask3Documents",
    "correctionTask3Documentless",
  ],
  getPromptOverridesDisplay: getPromptOverridesDisplayMock,
  updatePromptOverrides: updatePromptOverridesMock,
}));

const { GET, PUT } = await import("./route");

const ADMIN = { id: "cuid_admin_1", isAdmin: true };
const DISPLAY = {
  correctionBase: { label: "Shared base prompt", value: null, defaultValue: "You are a strict..." },
  correctionTask1: { label: "Tache 1", value: null, defaultValue: "TASK-SPECIFIC..." },
  correctionTask2: { label: "Tache 2", value: null, defaultValue: "TASK-SPECIFIC..." },
  correctionTask3Documents: { label: "Tache 3 (with source documents)", value: null, defaultValue: "TASK-SPECIFIC..." },
  correctionTask3Documentless: { label: "Tache 3 (no source documents)", value: null, defaultValue: "TASK-SPECIFIC..." },
};

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  getPromptOverridesDisplayMock.mockReset();
  updatePromptOverridesMock.mockReset();
  getAdminApiUserMock.mockResolvedValue(ADMIN);
  getPromptOverridesDisplayMock.mockResolvedValue(DISPLAY);
});

describe("GET /api/admin/prompts", () => {
  it("answers 404 for a non-admin caller", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    expect(getPromptOverridesDisplayMock).not.toHaveBeenCalled();
  });

  it("returns the current display state for an admin", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(DISPLAY);
  });
});

describe("PUT /api/admin/prompts", () => {
  it("answers 404 for a non-admin caller", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await PUT(new Request("http://localhost/api/admin/prompts", { method: "PUT", body: "{}" }));

    expect(response.status).toBe(404);
    expect(updatePromptOverridesMock).not.toHaveBeenCalled();
  });

  it("rejects an unrecognized field", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/prompts", {
        method: "PUT",
        body: JSON.stringify({ unexpectedField: "value" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(updatePromptOverridesMock).not.toHaveBeenCalled();
  });

  it("rejects a prompt block that is too long", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/prompts", {
        method: "PUT",
        body: JSON.stringify({ correctionTask1: "x".repeat(20_001) }),
      }),
    );

    expect(response.status).toBe(400);
    expect(updatePromptOverridesMock).not.toHaveBeenCalled();
  });

  it("rejects a nonblank correctionBase override missing the feedback-language token", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/prompts", {
        method: "PUT",
        body: JSON.stringify({ correctionBase: "You are a strict evaluator with no language instruction." }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("{{feedbackLanguage}}");
    expect(updatePromptOverridesMock).not.toHaveBeenCalled();
  });

  it("accepts a nonblank correctionBase override that includes the feedback-language token", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/prompts", {
        method: "PUT",
        body: JSON.stringify({ correctionBase: "Write feedback in {{feedbackLanguage}}." }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePromptOverridesMock).toHaveBeenCalledWith({
      correctionBase: "Write feedback in {{feedbackLanguage}}.",
    });
  });

  it("accepts clearing correctionBase to blank without requiring the feedback-language token", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/prompts", {
        method: "PUT",
        body: JSON.stringify({ correctionBase: "" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePromptOverridesMock).toHaveBeenCalledWith({ correctionBase: "" });
  });

  it("only forwards fields present in the request body, then returns the fresh display state", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/prompts", {
        method: "PUT",
        body: JSON.stringify({ correctionTask1: "Custom Tache 1 rubric." }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updatePromptOverridesMock).toHaveBeenCalledWith({ correctionTask1: "Custom Tache 1 rubric." });
    expect(getPromptOverridesDisplayMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual(DISPLAY);
  });

  it("accepts null to clear a block back to its default", async () => {
    const response = await PUT(
      new Request("http://localhost/api/admin/prompts", {
        method: "PUT",
        body: JSON.stringify({ correctionBase: null }),
      }),
    );

    expect(response.status).toBe(200);
    expect(updatePromptOverridesMock).toHaveBeenCalledWith({ correctionBase: null });
  });
});
