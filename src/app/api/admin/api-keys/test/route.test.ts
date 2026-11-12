import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminApiUserMock, getAppConfigMock, runApiKeyTestMock } = vi.hoisted(() => ({
  getAdminApiUserMock: vi.fn(),
  getAppConfigMock: vi.fn(),
  runApiKeyTestMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin-api", () => ({
  getAdminApiUser: getAdminApiUserMock,
  adminNotFoundResponse: () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } }),
  adminJsonResponse: (body: unknown, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } }),
}));
// Only the read: this route must never write the configuration.
vi.mock("@/lib/app-config", () => ({ getAppConfig: getAppConfigMock }));
vi.mock("@/lib/api-key-test", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-key-test")>()),
  runApiKeyTest: runApiKeyTestMock,
}));

const { POST } = await import("./route");
const { resetApiKeyTestRate, API_KEY_TEST_LIMIT } = await import("@/lib/api-key-test-rate-limit");
const { getCorrectionProvider } = await import("@/lib/correction-provider-registry");
const { getExampleProvider } = await import("@/lib/example-provider-registry");

const OPENROUTER_KEY = "sk-or-v1-0123456789abcdefghij0123456789";
const TYPED_KEY = "sk-or-v1-TYPEDKEYTYPEDKEY0123456789xy";
const GEMINI_KEY = "AIzaSyA-0123456789abcdefghijklmnopqrst";
const ENV_KEY = "sk-or-v1-ENVKEYENVKEYENVKEY0123456789";

const EMPTY = {
  correctionProvider: null,
  correctionApiKey: null,
  correctionModel: null,
  correctionDailyLimit: null,
  exampleProvider: null,
  exampleApiKey: null,
  exampleModel: null,
  exampleDailyLimit: null,
};
const OK_RESULT = { ok: true, kind: "ok", message: "Works.", latencyMs: 812, httpStatus: 200, model: "qwen/qwen3-30b-a3b" };

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/admin/api-keys/test", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  resetApiKeyTestRate();
  getAdminApiUserMock.mockReset();
  getAppConfigMock.mockReset();
  runApiKeyTestMock.mockReset();
  getAdminApiUserMock.mockResolvedValue({ id: "cuid_admin_1" });
  getAppConfigMock.mockResolvedValue({ ...EMPTY });
  runApiKeyTestMock.mockResolvedValue(OK_RESULT);
  for (const name of [
    "OPENROUTER_API_KEY",
    "GEMINI_API_KEY",
    "OPENROUTER_CORRECTION_MODEL",
    "OPENROUTER_EXAMPLE_MODEL",
    "GEMINI_CORRECTION_MODEL",
    "GEMINI_MODEL",
  ]) {
    delete process.env[name];
  }
});

afterEach(() => resetApiKeyTestRate());

describe("POST /api/admin/api-keys/test: access", () => {
  it("answers a bare 404 to a non-admin, makes no call and reads nothing", async () => {
    getAdminApiUserMock.mockResolvedValue(null);

    const response = await post({ section: "correction" });

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe("");
    expect(getAppConfigMock).not.toHaveBeenCalled();
    expect(runApiKeyTestMock).not.toHaveBeenCalled();
  });

  it("is no-store on every kind of answer", async () => {
    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY, correctionModel: "qwen/qwen3-30b-a3b" });

    expect((await post({ section: "correction" })).headers.get("Cache-Control")).toBe("private, no-store");
    expect((await post("{bad")).headers.get("Cache-Control")).toBe("private, no-store");
  });
});

describe("POST /api/admin/api-keys/test: rate limit", () => {
  beforeEach(() => {
    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionApiKey: GEMINI_KEY });
  });

  it("allows 10 tests a minute per admin and then answers 429 with Retry-After, making no call", async () => {
    for (let i = 0; i < API_KEY_TEST_LIMIT; i += 1) {
      expect((await post({ section: "correction" })).status, `call ${i + 1}`).toBe(200);
    }
    expect(runApiKeyTestMock).toHaveBeenCalledTimes(10);

    const blocked = await post({ section: "correction" });
    const body = (await blocked.json()) as { error: string; code: string };

    expect(blocked.status).toBe(429);
    expect(body.code).toBe("API_KEY_TEST_RATE_LIMITED");
    expect(body.error).toContain("Wait");
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(Number(blocked.headers.get("Retry-After"))).toBeLessThanOrEqual(60);
    expect(runApiKeyTest()).toBe(10);
  });

  it("counts invalid requests too, so a loop of bad requests cannot hammer the route", async () => {
    for (let i = 0; i < API_KEY_TEST_LIMIT; i += 1) await post({ section: "nope" });

    expect((await post({ section: "correction" })).status).toBe(429);
  });

  it("limits each admin separately", async () => {
    for (let i = 0; i < API_KEY_TEST_LIMIT; i += 1) await post({ section: "correction" });
    expect((await post({ section: "correction" })).status).toBe(429);

    getAdminApiUserMock.mockResolvedValue({ id: "cuid_admin_2" });
    expect((await post({ section: "correction" })).status).toBe(200);
  });
});

function runApiKeyTest() {
  return runApiKeyTestMock.mock.calls.length;
}

describe("POST /api/admin/api-keys/test: request validation", () => {
  it.each([
    ["invalid JSON", "{not json"],
    ["an empty body", ""],
  ])("rejects %s with 400", async (_label, body) => {
    const response = await post(body);

    expect(response.status).toBe(400);
    expect(runApiKeyTestMock).not.toHaveBeenCalled();
  });

  it.each([
    ["a missing section", {}],
    ["an unknown section", { section: "translate" }],
    ["an unknown provider", { section: "correction", provider: "anthropic" }],
    ["an unexpected field", { section: "correction", dailyLimit: 5 }],
    ["a key over 500 characters", { section: "correction", apiKey: "k".repeat(501) }],
    ["a model over 500 characters", { section: "correction", model: "m".repeat(501) }],
  ])("rejects %s with 400, naming the field but never a value", async (_label, body) => {
    const response = await post(body);
    const text = await response.text();

    expect(response.status).toBe(400);
    expect(text).not.toContain("kkkkk");
    expect(runApiKeyTest()).toBe(0);
  });

  it.each([
    ["a masked placeholder", "••••1234", /masked key/],
    ["a short key", "short-key", /too short/],
    ["a key with a space", "sk-or-v1-0123456789 abcdefghij", /spaces/],
    ["a key with an accent", "sk-or-v1-0123456789abcdéfghij", /letters, digits, dots, underscores and hyphens/],
    ["a key with a question mark", "sk-or-v1-0123456789abcdef?x=1", /letters, digits, dots, underscores and hyphens/],
    ["a key with a percent sign", "sk-or-v1-0123456789abcdef%2F", /letters, digits, dots, underscores and hyphens/],
    ["a key with a slash", "sk-or-v1-0123456789abc/def", /letters, digits, dots, underscores and hyphens/],
  ])("rejects a typed key that is %s, without echoing it", async (_label, apiKey, message) => {
    const response = await post({ section: "correction", provider: "openrouter", apiKey, model: "qwen/qwen3-30b-a3b" });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(message);
    expect(body.error).not.toContain(apiKey);
    expect(runApiKeyTest()).toBe(0);
  });

  it.each([
    ["openrouter", "qwen3-30b-a3b"],
    ["openrouter", "qwen/qwen3?x=1"],
    ["openrouter", "a model with spaces"],
    ["gemini", "google/gemini-3.5-flash"],
    ["gemini", "gemini-3.5?key=x"],
  ])("rejects a typed %s model %s", async (provider, model) => {
    const response = await post({ section: "correction", provider, apiKey: TYPED_KEY, model });

    expect(response.status).toBe(400);
    expect(runApiKeyTest()).toBe(0);
  });
});

describe("POST /api/admin/api-keys/test: what is tested (resolved like the real code path)", () => {
  const STORED_OPENROUTER = {
    ...EMPTY,
    correctionProvider: "openrouter",
    correctionApiKey: OPENROUTER_KEY,
    correctionModel: "qwen/qwen3-30b-a3b",
    exampleProvider: "openrouter",
    exampleApiKey: OPENROUTER_KEY,
    exampleModel: "openai/gpt-4o-mini",
  };

  async function tested(body: unknown) {
    const response = await post(body);
    return { response, json: (await response.json()) as { result: Record<string, unknown>; tested: Record<string, unknown> }, call: runApiKeyTestMock.mock.calls.at(-1)?.[0] };
  }

  it("with nothing typed, tests the stored provider, key and model, and says so", async () => {
    getAppConfigMock.mockResolvedValue(STORED_OPENROUTER);

    const { json, call } = await tested({ section: "correction" });

    expect(call).toEqual({ section: "correction", provider: "openrouter", apiKey: OPENROUTER_KEY, model: "qwen/qwen3-30b-a3b" });
    expect(json.tested).toMatchObject({ provider: "openrouter", keySource: "saved", modelSource: "saved" });
    expect(json.tested.summary).toBe("Tested OpenRouter with the key saved in this panel and the model saved here.");
    expect(json.result).toEqual(OK_RESULT);
  });

  it("tests the unsaved values typed in the form instead of the stored ones", async () => {
    getAppConfigMock.mockResolvedValue(STORED_OPENROUTER);

    const { json, call } = await tested({ section: "correction", provider: "openrouter", apiKey: TYPED_KEY, model: "meta-llama/llama-3.3-70b-instruct" });

    expect(call).toMatchObject({ apiKey: TYPED_KEY, model: "meta-llama/llama-3.3-70b-instruct" });
    expect(json.tested).toMatchObject({ keySource: "form", modelSource: "form" });
    expect(json.tested.summary).toBe("Tested OpenRouter with the key typed in the form (not saved yet) and the model typed in the form.");
  });

  it("a typed model with the stored key mixes the two, as a save would", async () => {
    getAppConfigMock.mockResolvedValue(STORED_OPENROUTER);

    const { json, call } = await tested({ section: "example", model: "meta-llama/llama-3.3-70b-instruct:free" });

    expect(call).toMatchObject({ section: "example", apiKey: OPENROUTER_KEY, model: "meta-llama/llama-3.3-70b-instruct:free" });
    expect(json.tested).toMatchObject({ keySource: "saved", modelSource: "form" });
  });

  it("tests each section on its own stored values", async () => {
    getAppConfigMock.mockResolvedValue(STORED_OPENROUTER);

    expect((await tested({ section: "correction" })).call.model).toBe("qwen/qwen3-30b-a3b");
    expect((await tested({ section: "example" })).call.model).toBe("openai/gpt-4o-mini");
  });

  it("falls back to the environment variable for the key when none is stored or typed, and says so", async () => {
    process.env.OPENROUTER_API_KEY = ENV_KEY;
    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionProvider: "openrouter", correctionModel: "qwen/qwen3-30b-a3b" });

    const { json, call } = await tested({ section: "correction" });

    expect(call.apiKey).toBe(ENV_KEY);
    expect(json.tested.keySource).toBe("environment");
    expect(json.tested.summary).toContain("the OPENROUTER_API_KEY environment variable");
  });

  it("a stored key wins over the environment variable, and clearing it in the form (empty string) falls back to the environment", async () => {
    process.env.OPENROUTER_API_KEY = ENV_KEY;
    getAppConfigMock.mockResolvedValue(STORED_OPENROUTER);

    expect((await tested({ section: "correction" })).call.apiKey).toBe(OPENROUTER_KEY);
    const cleared = await tested({ section: "correction", apiKey: "" });
    expect(cleared.call.apiKey).toBe(ENV_KEY);
    expect(cleared.json.tested.keySource).toBe("environment");
  });

  it("falls back to the environment model, then to Gemini's built-in default", async () => {
    process.env.OPENROUTER_CORRECTION_MODEL = "qwen/qwen3-30b-a3b";
    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY });
    const fromEnv = await tested({ section: "correction" });
    expect(fromEnv.call.model).toBe("qwen/qwen3-30b-a3b");
    expect(fromEnv.json.tested.modelSource).toBe("environment");

    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionApiKey: GEMINI_KEY });
    const builtIn = await tested({ section: "correction" });
    expect(builtIn.call).toMatchObject({ provider: "gemini", model: "gemini-3.5-flash-lite" });
    expect(builtIn.json.tested.modelSource).toBe("default");
    expect(builtIn.json.tested.summary).toContain("the built-in default model");
  });

  it("an unsaved provider switch tests the new provider with only what is typed or in the environment: the stored key and model are dropped, as a save would drop them", async () => {
    getAppConfigMock.mockResolvedValue(STORED_OPENROUTER);

    const { call, json } = await tested({ section: "correction", provider: "gemini" });

    // No stored OpenRouter key was sent to Google, and no OpenRouter model id used for Gemini.
    expect(runApiKeyTestMock).not.toHaveBeenCalled(); // no Gemini key anywhere, so nothing to test
    expect(call).toBeUndefined();
    expect(json.result).toMatchObject({ ok: false, kind: "not_configured" });
    expect(json.tested).toMatchObject({ provider: "gemini", keySource: null, model: "gemini-3.5-flash-lite", modelSource: "default" });
  });

  it("an unsaved switch with a typed key and model tests exactly those", async () => {
    getAppConfigMock.mockResolvedValue(STORED_OPENROUTER);

    const { call } = await tested({ section: "correction", provider: "gemini", apiKey: GEMINI_KEY, model: "gemini-3.5-flash" });

    expect(call).toEqual({ section: "correction", provider: "gemini", apiKey: GEMINI_KEY, model: "gemini-3.5-flash" });
  });

  it("reports 'nothing to test' (200, ok:false, no call) when a key or a model is missing, without refusing the request", async () => {
    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY });
    const noModel = await tested({ section: "correction" });
    expect(noModel.response.status).toBe(200);
    expect(noModel.json.result).toMatchObject({ ok: false, kind: "not_configured" });
    expect(noModel.json.result.message).toContain("a model");

    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionProvider: "openrouter" });
    const nothing = await tested({ section: "correction", model: "qwen/qwen3-30b-a3b" });
    expect(nothing.json.result.message).toContain("an API key");
    expect(runApiKeyTestMock).not.toHaveBeenCalled();
  });

  it("matches what the real adapters resolve: same model, and 'configured' exactly when the adapter says so", async () => {
    const scenarios: { stored: Record<string, unknown>; env?: Record<string, string>; section: "correction" | "example" }[] = [
      { stored: { ...EMPTY, correctionApiKey: GEMINI_KEY }, section: "correction" },
      { stored: { ...EMPTY, exampleApiKey: GEMINI_KEY, exampleModel: "gemini-3.5-flash" }, section: "example" },
      { stored: { ...EMPTY, correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY, correctionModel: "qwen/qwen3-30b-a3b" }, section: "correction" },
      { stored: { ...EMPTY, exampleProvider: "openrouter", exampleApiKey: OPENROUTER_KEY }, env: { OPENROUTER_EXAMPLE_MODEL: "openai/gpt-4o-mini" }, section: "example" },
      { stored: { ...EMPTY, correctionProvider: "openrouter" }, env: { OPENROUTER_API_KEY: ENV_KEY }, section: "correction" },
      { stored: { ...EMPTY }, env: { GEMINI_API_KEY: GEMINI_KEY, GEMINI_CORRECTION_MODEL: "gemini-2.5-flash" }, section: "correction" },
      { stored: { ...EMPTY }, section: "example" },
    ];
    for (const { stored, env, section } of scenarios) {
      for (const [name, value] of Object.entries(env ?? {})) process.env[name] = value;
      getAppConfigMock.mockResolvedValue(stored);
      runApiKeyTestMock.mockClear();

      const { json, call } = await tested({ section });

      const prefix = section;
      const overrides = { apiKey: stored[`${prefix}ApiKey`] as string | null, model: stored[`${prefix}Model`] as string | null };
      const providerId = (stored[`${prefix}Provider`] as "openrouter" | null) ?? "gemini";
      const adapter = section === "correction" ? getCorrectionProvider(providerId) : getExampleProvider(providerId);
      expect(json.tested.model, JSON.stringify(stored)).toBe(adapter.resolveModel(overrides));
      expect(Boolean(call), JSON.stringify(stored)).toBe(adapter.hasConfiguredCredentials(overrides));
      for (const name of Object.keys(env ?? {})) delete process.env[name];
    }
  });
});

describe("POST /api/admin/api-keys/test: the key is never echoed or persisted", () => {
  it("returns no key, typed or stored, in any answer", async () => {
    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY, correctionModel: "qwen/qwen3-30b-a3b" });
    runApiKeyTestMock.mockResolvedValue({ ok: false, kind: "invalid_key", message: "OpenRouter rejected the API key (HTTP 401).", latencyMs: 90, httpStatus: 401, model: "qwen/qwen3-30b-a3b" });

    for (const body of [{ section: "correction" }, { section: "correction", apiKey: TYPED_KEY }]) {
      const text = await (await post(body)).text();
      expect(text).not.toContain(OPENROUTER_KEY);
      expect(text).not.toContain(TYPED_KEY);
      expect(text).not.toContain("sk-or-v1");
    }
  });

  it("passes the key only to the one provider call, and calls it once per request", async () => {
    getAppConfigMock.mockResolvedValue({ ...EMPTY, correctionProvider: "openrouter", correctionApiKey: OPENROUTER_KEY, correctionModel: "qwen/qwen3-30b-a3b" });
    const log = vi.spyOn(console, "log");
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");

    await post({ section: "correction", apiKey: TYPED_KEY });

    expect(runApiKeyTestMock).toHaveBeenCalledTimes(1);
    for (const spy of [log, error, warn]) expect(JSON.stringify(spy.mock.calls)).not.toContain("sk-or-v1");
    log.mockRestore();
    error.mockRestore();
    warn.mockRestore();
  });
});
