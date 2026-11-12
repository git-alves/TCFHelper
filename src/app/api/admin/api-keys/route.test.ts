import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, getAppConfigMock, getAppConfigDisplayMock, updateAppConfigMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  getAppConfigMock: vi.fn(),
  getAppConfigDisplayMock: vi.fn(),
  updateAppConfigMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
vi.mock("@/lib/app-config", () => ({
  getAppConfig: getAppConfigMock,
  getAppConfigDisplay: getAppConfigDisplayMock,
  updateAppConfig: updateAppConfigMock,
}));

const { GET, PUT } = await import("./route");

const ADMIN = { id: "cuid_admin_1", isAdmin: true };
const DISPLAY = {
  correctionProvider: "gemini",
  correction: {
    apiKeySet: false,
    apiKeyMasked: null,
    apiKeyFromEnv: true,
    model: null,
    modelDefault: "gemini-3.5-flash-lite",
    dailyLimit: 1000,
    dailyLimitIsDefault: true,
    requestsToday: 12,
  },
  example: {
    apiKeySet: false,
    apiKeyMasked: null,
    apiKeyFromEnv: true,
    model: null,
    modelDefault: "gemini-3.5-flash",
    dailyLimit: 1000,
    dailyLimitIsDefault: true,
    requestsToday: 3,
  },
  exampleProvider: "gemini",
};

const EMPTY_STORED = {
  correctionProvider: null,
  correctionApiKey: null,
  correctionModel: null,
  correctionDailyLimit: null,
  exampleProvider: null,
  exampleApiKey: null,
  exampleModel: null,
  exampleDailyLimit: null,
};

beforeEach(() => {
  getAdminApiUserMock.mockReset();
  getAppConfigMock.mockReset();
  getAppConfigDisplayMock.mockReset();
  updateAppConfigMock.mockReset();
  getAdminApiUserMock.mockResolvedValue(ADMIN);
  getAppConfigMock.mockResolvedValue({ ...EMPTY_STORED });
  getAppConfigDisplayMock.mockResolvedValue(DISPLAY);
});

describe("GET /api/admin/api-keys", () => {
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

const OPENROUTER_KEY = "sk-or-v1-0123456789abcdefghij0123456789";
const GEMINI_KEY = "AIzaSyA-0123456789abcdefghijklmnopqrst";

function put(body: unknown) {
  return PUT(
    new Request("http://localhost/api/admin/api-keys", {
      method: "PUT",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("PUT /api/admin/api-keys", () => {
  it("answers 404 for a non-admin caller", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await put({});

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(updateAppConfigMock).not.toHaveBeenCalled();
    expect(getAppConfigMock).not.toHaveBeenCalled();
  });

  it("rejects a body that is not valid JSON with 400, not a silent 200", async () => {
    const response = await put("{not json");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "The request body must be valid JSON." });
    expect(updateAppConfigMock).not.toHaveBeenCalled();
  });

  it("rejects an empty body the same way", async () => {
    const response = await PUT(new Request("http://localhost/api/admin/api-keys", { method: "PUT" }));

    expect(response.status).toBe(400);
    expect(updateAppConfigMock).not.toHaveBeenCalled();
  });

  it("rejects an unrecognized field, naming it but never a value", async () => {
    const response = await put({ unexpectedField: "value-that-must-not-be-echoed" });
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).not.toContain("value-that-must-not-be-echoed");
    expect(updateAppConfigMock).not.toHaveBeenCalled();
  });

  it("rejects a text field that is too long", async () => {
    expect((await put({ correctionApiKey: "x".repeat(501) })).status).toBe(400);
    expect((await put({ correctionModel: "x".repeat(501) })).status).toBe(400);
    expect(updateAppConfigMock).not.toHaveBeenCalled();
  });

  it("rejects a daily limit of zero or below, and a non-integer one", async () => {
    expect((await put({ correctionDailyLimit: 0 })).status).toBe(400);
    expect((await put({ exampleDailyLimit: 12.5 })).status).toBe(400);
    expect(updateAppConfigMock).not.toHaveBeenCalled();
  });

  it("accepts a null daily limit to reset it to the default", async () => {
    const response = await put({ correctionDailyLimit: null });

    expect(response.status).toBe(200);
    expect(updateAppConfigMock).toHaveBeenCalledWith({ correctionDailyLimit: null });
  });

  it("only forwards fields present in the request body, then returns the fresh display state", async () => {
    const response = await put({ correctionApiKey: GEMINI_KEY, correctionDailyLimit: 500 });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateAppConfigMock).toHaveBeenCalledWith({ correctionApiKey: GEMINI_KEY, correctionDailyLimit: 500 });
    expect(getAppConfigDisplayMock).toHaveBeenCalledTimes(1);
    expect(body).toEqual(DISPLAY);
  });

  it("clears a key or a model with an empty string, which needs no validation", async () => {
    await put({ correctionApiKey: "", exampleModel: "" });

    expect(updateAppConfigMock).toHaveBeenCalledWith({ correctionApiKey: "", exampleModel: "" });
  });

  it("changing only the model forwards only the model, so the stored key is untouched", async () => {
    getAppConfigMock.mockResolvedValue({ ...EMPTY_STORED, correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY });

    await put({ correctionModel: "qwen/qwen3-30b-a3b" });

    expect(updateAppConfigMock).toHaveBeenCalledWith({ correctionModel: "qwen/qwen3-30b-a3b" });
  });

  describe("provider ids", () => {
    it("accepts a recognized provider id and null (back to the default)", async () => {
      expect((await put({ correctionProvider: "gemini" })).status).toBe(200);
      expect((await put({ correctionProvider: null })).status).toBe(200);
      expect((await put({ exampleProvider: "gemini" })).status).toBe(200);
      expect((await put({ exampleProvider: null })).status).toBe(200);
    });

    it("rejects an unrecognized provider id for either section", async () => {
      expect((await put({ correctionProvider: "anthropic" })).status).toBe(400);
      expect((await put({ exampleProvider: "OpenRouter" })).status).toBe(400);
      expect(updateAppConfigMock).not.toHaveBeenCalled();
    });
  });

  describe("key validation", () => {
    it.each([
      ["a masked placeholder echoed back", "••••1234", /masked key/],
      ["a masked placeholder with more text", "••••abcdefghijklmnopqrstuvwxyz", /masked key/],
      ["a 2-character key", "ab", /too short/],
      ["a 19-character key", "a".repeat(19), /too short/],
      ["a key with a space", "sk-or-v1-0123456789 abcdefghij", /spaces or line breaks/],
      ["a key with a newline", "sk-or-v1-0123456789\nabcdefghij", /spaces or line breaks/],
      ["a key with a tab", "sk-or-v1-0123456789\tabcdefghij", /spaces or line breaks/],
      ["a key with an accented character", "sk-or-v1-0123456789abcdéfghij", /plain letters/],
      ["a key with an emoji", "sk-or-v1-0123456789abcdefgh😀", /plain letters/],
    ])("rejects %s with a message that does not echo it", async (_label, key, message) => {
      const response = await put({ correctionApiKey: key });
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toMatch(message);
      expect(body.error).toContain("Essay correction");
      expect(body.error).not.toContain(key);
      expect(updateAppConfigMock).not.toHaveBeenCalled();
    });

    it("names the section it came from", async () => {
      const body = (await (await put({ exampleApiKey: "short" })).json()) as { error: string };

      expect(body.error).toContain("Example generation");
    });

    it("accepts a key of exactly 20 visible ASCII characters and real-looking keys", async () => {
      expect((await put({ correctionApiKey: "a".repeat(20) })).status).toBe(200);
      expect((await put({ correctionApiKey: OPENROUTER_KEY })).status).toBe(200);
      expect((await put({ exampleApiKey: GEMINI_KEY })).status).toBe(200);
    });

    it("trims the surrounding whitespace of a pasted key before checking it", async () => {
      const response = await put({ correctionApiKey: `  ${GEMINI_KEY}\n` });

      expect(response.status).toBe(200);
      expect(updateAppConfigMock).toHaveBeenCalledWith({ correctionApiKey: `  ${GEMINI_KEY}\n` });
    });
  });

  describe("model validation", () => {
    it.each([
      "qwen/qwen3-30b-a3b",
      "meta-llama/llama-3.3-70b-instruct:free",
      "openai/gpt-4o-mini",
      "anthropic/claude-3.5-sonnet",
      "x-ai/grok-4.1-fast",
    ])("accepts the OpenRouter model %s", async (model) => {
      getAppConfigMock.mockResolvedValue({ ...EMPTY_STORED, correctionProvider: "openrouter" });

      expect((await put({ correctionModel: model })).status).toBe(200);
    });

    it.each([
      ["a model with spaces", "not a model"],
      ["a model with a query string", "qwen/qwen3?x=1"],
      ["a model with a fragment", "qwen/qwen3#frag"],
      ["a model with path traversal", "../../etc/passwd"],
      ["a model with two slashes", "a/b/c"],
      ["a model with no vendor", "qwen3-30b-a3b"],
      ["a model with a percent escape", "qwen/qwen3%2Fx"],
      ["a model with a leading slash", "/qwen/qwen3"],
      ["an empty variant", "qwen/qwen3:"],
      ["a model with an ampersand", "qwen/qwen3&x"],
    ])("rejects %s on OpenRouter", async (_label, model) => {
      getAppConfigMock.mockResolvedValue({ ...EMPTY_STORED, correctionProvider: "openrouter" });

      const response = await put({ correctionModel: model });
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toContain("vendor/model");
      expect(updateAppConfigMock).not.toHaveBeenCalled();
    });

    it.each(["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-3.5-flash"])("accepts the Gemini model %s", async (model) => {
      expect((await put({ correctionModel: model })).status).toBe(200);
      expect((await put({ exampleModel: model })).status).toBe(200);
    });

    it.each([
      ["a slash", "google/gemini-3.5-flash"],
      ["a space", "gemini 3.5"],
      ["a query string", "gemini-3.5?key=x"],
      ["a colon", "gemini-3.5:generateContent"],
      ["path traversal", "../gemini"],
    ])("rejects a Gemini model with %s, so it can never alter the request URL", async (_label, model) => {
      const response = await put({ correctionModel: model });
      const body = (await response.json()) as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toContain("Gemini");
      expect(updateAppConfigMock).not.toHaveBeenCalled();
    });

    it("validates against the provider the same request switches to, not the one stored", async () => {
      getAppConfigMock.mockResolvedValue({ ...EMPTY_STORED, correctionProvider: "openrouter" });

      // gemini-style name accepted when the request switches to gemini...
      expect((await put({ correctionProvider: "gemini", correctionModel: "gemini-3.5-flash" })).status).toBe(200);
      // ...and an OpenRouter-style id rejected for it.
      expect((await put({ correctionProvider: "gemini", correctionModel: "qwen/qwen3-30b-a3b" })).status).toBe(400);
    });

    it("validates an unsent-provider model against the stored provider", async () => {
      getAppConfigMock.mockResolvedValue({ ...EMPTY_STORED, exampleProvider: "openrouter" });

      expect((await put({ exampleModel: "gemini-3.5-flash" })).status).toBe(400);
    });
  });

  describe("switching a section's provider (clear-on-switch)", () => {
    const OPENROUTER_STORED = {
      ...EMPTY_STORED,
      correctionProvider: "openrouter",
      correctionApiKey: OPENROUTER_KEY,
      correctionModel: "qwen/qwen3-30b-a3b",
      exampleProvider: "openrouter",
      exampleApiKey: OPENROUTER_KEY,
      exampleModel: "openai/gpt-4o-mini",
    };

    it("removes that section's saved key and model when the provider changes and none are supplied", async () => {
      getAppConfigMock.mockResolvedValue(OPENROUTER_STORED);

      const response = await put({ correctionProvider: "gemini" });

      expect(response.status).toBe(200);
      expect(updateAppConfigMock).toHaveBeenCalledWith({
        correctionProvider: "gemini",
        correctionApiKey: null,
        correctionModel: null,
      });
    });

    it("leaves the other section alone", async () => {
      getAppConfigMock.mockResolvedValue(OPENROUTER_STORED);

      await put({ correctionProvider: "gemini" });

      const written = updateAppConfigMock.mock.calls[0][0];
      expect(written).not.toHaveProperty("exampleApiKey");
      expect(written).not.toHaveProperty("exampleModel");
      expect(written).not.toHaveProperty("exampleProvider");
    });

    it("keeps a key and a model the same request supplies for the new provider", async () => {
      getAppConfigMock.mockResolvedValue(OPENROUTER_STORED);

      const response = await put({ correctionProvider: "gemini", correctionApiKey: GEMINI_KEY, correctionModel: "gemini-3.5-flash" });

      expect(response.status).toBe(200);
      expect(updateAppConfigMock).toHaveBeenCalledWith({
        correctionProvider: "gemini",
        correctionApiKey: GEMINI_KEY,
        correctionModel: "gemini-3.5-flash",
      });
    });

    it("clears only the part the request does not supply", async () => {
      getAppConfigMock.mockResolvedValue(OPENROUTER_STORED);

      await put({ correctionProvider: "gemini", correctionApiKey: GEMINI_KEY });

      expect(updateAppConfigMock).toHaveBeenCalledWith({
        correctionProvider: "gemini",
        correctionApiKey: GEMINI_KEY,
        correctionModel: null,
      });
    });

    it("treats an empty model or key in the switching request as not supplied", async () => {
      getAppConfigMock.mockResolvedValue(OPENROUTER_STORED);

      await put({ correctionProvider: "gemini", correctionApiKey: "", correctionModel: "" });

      expect(updateAppConfigMock).toHaveBeenCalledWith({
        correctionProvider: "gemini",
        correctionApiKey: "",
        correctionModel: "",
      });
    });

    it("moving to the default (null) from OpenRouter is a switch too", async () => {
      getAppConfigMock.mockResolvedValue(OPENROUTER_STORED);

      await put({ exampleProvider: null });

      expect(updateAppConfigMock).toHaveBeenCalledWith({ exampleProvider: null, exampleApiKey: null, exampleModel: null });
    });

    it("does not clear anything when the provider is unchanged, including 'gemini' against a stored null (the same provider)", async () => {
      getAppConfigMock.mockResolvedValue({ ...EMPTY_STORED, correctionApiKey: GEMINI_KEY, correctionModel: "gemini-3.5-flash" });

      await put({ correctionProvider: "gemini" });
      expect(updateAppConfigMock).toHaveBeenLastCalledWith({ correctionProvider: "gemini" });

      getAppConfigMock.mockResolvedValue(OPENROUTER_STORED);
      await put({ correctionProvider: "openrouter", correctionModel: "qwen/qwen3-30b-a3b" });
      expect(updateAppConfigMock).toHaveBeenLastCalledWith({ correctionProvider: "openrouter", correctionModel: "qwen/qwen3-30b-a3b" });
    });

    describe("switching to OpenRouter needs a model", () => {
      afterEach(() => {
        delete process.env.OPENROUTER_CORRECTION_MODEL;
        delete process.env.OPENROUTER_EXAMPLE_MODEL;
      });

      it("is rejected with a clear 400 when no model is supplied and none is in the environment", async () => {
        const response = await put({ correctionProvider: "openrouter" });
        const body = (await response.json()) as { error: string };

        expect(response.status).toBe(400);
        expect(body.error).toContain("Essay correction");
        expect(body.error).toContain("OpenRouter has no default model");
        expect(updateAppConfigMock).not.toHaveBeenCalled();
      });

      it("is rejected even with a key, and for the example section", async () => {
        expect((await put({ correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY })).status).toBe(400);
        const example = await put({ exampleProvider: "openrouter", exampleApiKey: OPENROUTER_KEY });
        expect(example.status).toBe(400);
        expect(((await example.json()) as { error: string }).error).toContain("Example generation");
      });

      it("is rejected when the model is blank", async () => {
        expect((await put({ correctionProvider: "openrouter", correctionModel: "   " })).status).toBe(400);
      });

      it("is accepted with a model, which is saved with the switch", async () => {
        const response = await put({ correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY, correctionModel: "qwen/qwen3-30b-a3b" });

        expect(response.status).toBe(200);
        expect(updateAppConfigMock).toHaveBeenCalledWith({
          correctionProvider: "openrouter",
          correctionApiKey: OPENROUTER_KEY,
          correctionModel: "qwen/qwen3-30b-a3b",
        });
      });

      it("is accepted without a typed model when the environment supplies the default", async () => {
        process.env.OPENROUTER_CORRECTION_MODEL = "qwen/qwen3-30b-a3b";

        expect((await put({ correctionProvider: "openrouter" })).status).toBe(200);
        // The example section has its own environment variable.
        expect((await put({ exampleProvider: "openrouter" })).status).toBe(400);
      });

      it("an unchanged OpenRouter section may save without a model (only a switch is refused)", async () => {
        getAppConfigMock.mockResolvedValue({ ...EMPTY_STORED, correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY });

        expect((await put({ correctionProvider: "openrouter", correctionDailyLimit: 50 })).status).toBe(200);
      });
    });
  });
});
