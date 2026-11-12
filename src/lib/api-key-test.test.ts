import { describe, expect, it, vi } from "vitest";
import { API_KEY_TEST_MAX_TOKENS, API_KEY_TEST_TIMEOUT_MS, runApiKeyTest, sanitizeProviderMessage, type ApiKeyTestInput } from "./api-key-test";

const OPENROUTER_KEY = "sk-or-v1-SECRETKEYSECRETKEY0123456789";
const GEMINI_KEY = "AIzaSySECRETGEMINIKEY0123456789abcdef";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const orOk = (content: string, extra: Record<string, unknown> = {}, finish = "stop") => ({
  model: "openai/gpt-4o-mini-2024-07-18",
  choices: [{ finish_reason: finish, message: { content } }],
  ...extra,
});
const geminiOk = (text: string, finish = "STOP") => ({
  modelVersion: "gemini-3.5-flash-lite-001",
  candidates: [{ finishReason: finish, content: { parts: [{ text }] } }],
});

function input(overrides: Partial<ApiKeyTestInput> & { reply?: () => Response | Promise<Response> } = {}) {
  const { reply, ...rest } = overrides;
  const fetchImpl = vi.fn(async () => (reply ? reply() : json(orOk('{"ok": true}'))));
  return {
    fetchImpl,
    input: {
      section: "correction" as const,
      provider: "openrouter" as const,
      apiKey: OPENROUTER_KEY,
      model: "openai/gpt-4o-mini",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      ...rest,
    },
  };
}

async function run(overrides: Parameters<typeof input>[0] = {}) {
  const { input: i, fetchImpl } = input(overrides);
  const result = await runApiKeyTest(i);
  return { result, fetchImpl };
}

describe("runApiKeyTest: the request that is made", () => {
  it("OpenRouter correction: one structured-output call with require_parameters, a small token budget and a timeout", async () => {
    const { fetchImpl } = await run();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${OPENROUTER_KEY}`);
    expect(body.model).toBe("openai/gpt-4o-mini");
    expect(body.max_tokens).toBe(1024);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.schema).toMatchObject({ required: ["ok"], properties: { ok: { type: "boolean" } } });
    expect(body.provider).toEqual({ require_parameters: true });
    expect(body.messages).toHaveLength(1);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("OpenRouter example: a tiny plain completion with no response_format and no require_parameters", async () => {
    const { fetchImpl } = await run({ section: "example", reply: () => json(orOk("OK")) });

    const body = JSON.parse(((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body) as string);
    expect(body.max_tokens).toBe(512);
    expect(body).not.toHaveProperty("response_format");
    expect(body).not.toHaveProperty("provider");
  });

  it("Gemini correction: a responseSchema call with the key in the header, never in the URL", async () => {
    const { fetchImpl } = await run({
      provider: "gemini",
      apiKey: GEMINI_KEY,
      model: "gemini-3.5-flash-lite",
      reply: () => json(geminiOk('{"ok": true}')),
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    expect(url).not.toContain(GEMINI_KEY);
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(GEMINI_KEY);
    expect(body.generationConfig.maxOutputTokens).toBe(1024);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema.required).toEqual(["ok"]);
  });

  it("Gemini example: plain text, no schema", async () => {
    const { fetchImpl } = await run({ provider: "gemini", section: "example", apiKey: GEMINI_KEY, model: "gemini-3.5-flash", reply: () => json(geminiOk("OK")) });

    const body = JSON.parse(((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body) as string);
    expect(body.generationConfig).toEqual({ maxOutputTokens: 512 });
  });

  it("sends no essay or learner data: the prompt is a fixed tiny instruction", async () => {
    const { fetchImpl } = await run();

    const body = JSON.parse(((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body) as string);
    expect(JSON.stringify(body.messages).length).toBeLessThan(200);
    expect(API_KEY_TEST_TIMEOUT_MS).toBe(20_000);
    expect(API_KEY_TEST_MAX_TOKENS).toEqual({ correction: 1024, example: 512 });
  });
});

describe("runApiKeyTest: outcomes", () => {
  it("OK for a correction model that answers the schema, with latency and the model the provider reports", async () => {
    const { result } = await run();

    expect(result).toMatchObject({ ok: true, kind: "ok", httpStatus: 200, model: "openai/gpt-4o-mini-2024-07-18" });
    expect(result.message).toMatch(/^Works\. openai\/gpt-4o-mini-2024-07-18 answered in \d+\.\d s with structured JSON\.$/);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("OK when the JSON arrives wrapped in a code fence, as real corrections accept", async () => {
    const { result } = await run({ reply: () => json(orOk('```json\n{"ok": true}\n```')) });

    expect(result.kind).toBe("ok");
  });

  it("OK for an example model that answers", async () => {
    const { result } = await run({ section: "example", reply: () => json(orOk("OK")) });

    expect(result).toMatchObject({ ok: true, kind: "ok" });
    expect(result.message).not.toContain("structured");
  });

  it("OK for Gemini, using modelVersion as the echoed model", async () => {
    const { result } = await run({ provider: "gemini", apiKey: GEMINI_KEY, model: "gemini-3.5-flash-lite", reply: () => json(geminiOk('{"ok": true}')) });

    expect(result).toMatchObject({ ok: true, model: "gemini-3.5-flash-lite-001" });
  });

  it.each([
    ["401", 401, { error: { message: "No auth credentials found", code: 401 } }, "invalid_key"],
    ["403", 403, { error: { message: "forbidden", code: 403 } }, "invalid_key"],
    ["402", 402, { error: { message: "Insufficient credits", code: 402 } }, "no_credits"],
    ["404 unknown model", 404, { error: { message: "No endpoints found for bad/model", code: 404 } }, "model_not_found"],
    ["400 invalid model id", 400, { error: { message: "bad/model is not a valid model ID", code: 400 } }, "model_not_found"],
    ["400 unclassified", 400, { error: { message: "Something odd", code: 400 } }, "bad_request"],
    ["429", 429, { error: { message: "Rate limit exceeded", code: 429 } }, "rate_limited"],
    ["503", 503, { error: { message: "Provider overloaded", code: 503 } }, "overloaded"],
    ["500", 500, { error: { message: "boom", code: 500 } }, "provider_error"],
    ["502", 502, { error: { message: "bad gateway", code: 502 } }, "provider_error"],
  ])("maps an OpenRouter %s to %s", async (_label, status, body, kind) => {
    const { result } = await run({ reply: () => json(body, status) });

    expect(result).toMatchObject({ ok: false, kind, httpStatus: status });
    expect(result.message.length).toBeGreaterThan(20);
  });

  it("calls a 404 or 400 that talks about parameters or structured output 'structured output unsupported' for correction, not 'model not found'", async () => {
    for (const [status, message] of [
      [404, "No endpoints found that can handle the requested parameters"],
      [400, "Provider does not support response_format json_schema"],
      [404, "No endpoints found that support structured outputs"],
    ] as const) {
      const { result } = await run({ reply: () => json({ error: { message, code: status } }, status) });
      expect(result.kind, message).toBe("structured_output_unsupported");
      expect(result.message).toContain("structured JSON");
    }
  });

  it("the same parameter message on the example section is just a model-not-found (examples need no structured output)", async () => {
    const { result } = await run({ section: "example", reply: () => json({ error: { message: "No endpoints found that can handle the requested parameters", code: 404 } }, 404) });

    expect(result.kind).toBe("model_not_found");
  });

  it("treats a 200 carrying an embedded error object by its real code", async () => {
    const rate = await run({ reply: () => json({ error: { message: "Provider returned error", code: 429 } }) });
    const key = await run({ reply: () => json({ error: { message: "bad key", code: 401 } }) });

    expect(rate.result).toMatchObject({ kind: "rate_limited", httpStatus: 429 });
    expect(key.result).toMatchObject({ kind: "invalid_key", httpStatus: 401 });
  });

  it("maps Gemini's invalid-key 400, 403, 404, 429 and 503", async () => {
    const gemini = { provider: "gemini" as const, apiKey: GEMINI_KEY, model: "gemini-3.5-flash-lite" };
    const cases: [number, string, string][] = [
      [400, "API key not valid. Please pass a valid API key.", "invalid_key"],
      [403, "Permission denied", "invalid_key"],
      [404, "models/gemini-9 is not found for API version v1beta", "model_not_found"],
      [429, "Resource has been exhausted", "rate_limited"],
      [503, "The model is overloaded", "overloaded"],
    ];
    for (const [status, message, kind] of cases) {
      const { result } = await run({ ...gemini, reply: () => json({ error: { code: status, message, status: "X" } }, status) });
      expect(result.kind, `${status} ${message}`).toBe(kind);
    }
  });

  it("a model that answers in prose does not support structured output", async () => {
    const { result } = await run({ reply: () => json(orOk("Sure! Here is my answer: yes, it works.")) });

    expect(result).toMatchObject({ ok: false, kind: "structured_output_unsupported" });
  });

  it("JSON that does not match the schema is flagged, not passed", async () => {
    const { result } = await run({ reply: () => json(orOk('{"fine": 1}')) });

    expect(result).toMatchObject({ ok: false, kind: "unexpected_response" });
  });

  it("an empty answer is unexpected; an empty answer cut off at the token limit is 'truncated' with an explanation", async () => {
    const empty = await run({ reply: () => json(orOk("")) });
    const cut = await run({ reply: () => json(orOk("", {}, "length")) });
    const cutMid = await run({ reply: () => json(orOk('{"ok', {}, "length")) });

    expect(empty.result.kind).toBe("unexpected_response");
    expect(cut.result.kind).toBe("truncated");
    expect(cut.result.message).toContain("1,024-token limit");
    expect(cut.result.message).toContain("8,192");
    expect(cutMid.result.kind).toBe("truncated");
  });

  it("a timeout and a network failure are reported separately", async () => {
    const timeout = await run({ reply: () => Promise.reject(Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })) });
    const network = await run({ reply: () => Promise.reject(new TypeError("fetch failed")) });

    expect(timeout.result).toMatchObject({ ok: false, kind: "timeout", httpStatus: null });
    expect(timeout.result.message).toContain("20 seconds");
    expect(network.result).toMatchObject({ ok: false, kind: "network" });
  });

  it("an error body that is not JSON still gives a result with the HTTP status", async () => {
    const { result } = await run({ reply: () => new Response("<html>Bad gateway</html>", { status: 502 }) });

    expect(result).toMatchObject({ ok: false, kind: "provider_error", httpStatus: 502 });
  });
});

describe("runApiKeyTest: the key is never echoed", () => {
  it.each([
    ["an OpenRouter 401", 401, { error: { message: `No auth credentials found for key ${OPENROUTER_KEY}`, code: 401 } }, "openrouter"],
    ["an OpenRouter 403", 403, { error: { message: `Forbidden: ${OPENROUTER_KEY}`, code: 403 } }, "openrouter"],
    ["a Gemini 400 invalid key", 400, { error: { message: `API key not valid. Please pass a valid API key. (${GEMINI_KEY})`, code: 400 } }, "gemini"],
    ["a Gemini 403", 403, { error: { message: `Permission denied for ${GEMINI_KEY}`, code: 403 } }, "gemini"],
  ] as const)("a credential failure (%s) carries no provider text at all", async (_label, status, body, provider) => {
    const { result } = await run(
      provider === "gemini"
        ? { provider: "gemini", apiKey: GEMINI_KEY, model: "gemini-3.5-flash-lite", reply: () => json(body, status) }
        : { reply: () => json(body, status) },
    );

    expect(result.kind).toBe("invalid_key");
    // Our own sentence only: no quoted provider message, whatever it echoed.
    expect(result.message).not.toContain("said:");
    expect(result.message).not.toContain("“");
    expect(JSON.stringify(result)).not.toContain("SECRETKEY");
    expect(JSON.stringify(result)).not.toContain("SECRETGEMINI");
  });

  it("a 401 that arrives as an embedded error in a 200 body is a credential failure too", async () => {
    const { result } = await run({ reply: () => json({ error: { message: `bad key ${OPENROUTER_KEY}`, code: 401 } }) });

    expect(result.kind).toBe("invalid_key");
    expect(result.message).not.toContain("said:");
  });

  it("for the other outcomes, the provider's message is shown but anything of the key in it is redacted", async () => {
    const { result } = await run({
      reply: () => json({ error: { message: `Rate limit hit for ${OPENROUTER_KEY} on this account`, code: 429 } }, 429),
    });

    expect(result.kind).toBe("rate_limited");
    expect(result.message).toContain("OpenRouter said: “Rate limit hit for [redacted] on this account”");
    expect(JSON.stringify(result)).not.toContain("SECRETKEY");
  });

  it("keeps an ordinary 503 message intact even when the key contains one of its words", async () => {
    const { result } = await run({
      apiKey: "overload-0123456789abcd",
      reply: () => json({ error: { message: "The model is overloaded; retry later", code: 503 } }, 503),
    });

    expect(result.kind).toBe("overloaded");
    expect(result.message).toContain("OpenRouter said: “The model is overloaded; retry later”");
  });

  it("includes the provider's own short message, trimmed to one line of at most 200 characters", async () => {
    const { result } = await run({ reply: () => json({ error: { message: `Rate\n limit ${"x".repeat(400)}`, code: 429 } }, 429) });

    const said = result.message.match(/said: “([^”]*)”/)![1];
    expect(said.length).toBeLessThanOrEqual(200);
    expect(said).not.toContain("\n");
    expect(said.startsWith("Rate limit")).toBe(true);
  });

  it("no outcome ever contains the key", async () => {
    const replies: (() => Response | Promise<Response>)[] = [
      () => json(orOk('{"ok": true}')),
      () => json({ error: { message: `x ${OPENROUTER_KEY}`, code: 401 } }, 401),
      () => json({ error: { message: `x ${OPENROUTER_KEY}`, code: 500 } }, 500),
      () => json(orOk("prose")),
      () => Promise.reject(new TypeError(`fetch failed ${OPENROUTER_KEY}`)),
      () => Promise.reject(Object.assign(new Error(OPENROUTER_KEY), { name: "TimeoutError" })),
    ];
    for (const reply of replies) {
      const { result } = await run({ reply });
      expect(JSON.stringify(result)).not.toContain("SECRETKEY");
    }
  });
});

describe("sanitizeProviderMessage", () => {
  // A key with characters the charset would now refuse, to prove the redactor
  // does not rely on that: it must still hold for a stored legacy value.
  const AWKWARD_KEY = 'sk-test/AbCdEf?GhIjKl%Mn+Op="Qr\\St' + "0123456789";

  it("redacts the key as sent, URL-encoded and JSON-escaped", () => {
    const encoded = encodeURIComponent(AWKWARD_KEY);
    const escaped = JSON.stringify(AWKWARD_KEY).slice(1, -1);
    const text = sanitizeProviderMessage(`as sent ${AWKWARD_KEY}; in a URL ?key=${encoded}; in a JSON body ${escaped}.`, AWKWARD_KEY)!;

    expect(text).not.toContain(AWKWARD_KEY);
    expect(text).not.toContain(encoded);
    expect(text).not.toContain(escaped);
    expect(text).not.toContain("GhIjKl");
    expect(text).not.toContain("AbCdEf");
    expect(text).toContain("as sent [redacted]");
  });

  it("redacts a partial echo of 16 or more consecutive characters, anywhere in the key, whatever its case", () => {
    const key = "sk-or-v1-abcdef0123456789ZYXWVUTSRQPONMLK";

    for (const echo of [
      key.slice(0, 16), // exactly sixteen, at the start
      key.slice(-16), // the end
      key.slice(10, 28), // the middle
      key.slice(0, 30), // a longer run is replaced whole, with nothing left over
      key.slice(10, 28).toUpperCase(), // case-folded
    ]) {
      const text = sanitizeProviderMessage(`Provider says the credential beginning ${echo} is wrong`, key)!;
      expect(text, echo).toBe("Provider says the credential beginning [redacted] is wrong");
    }
  });

  it("a 16-character run of a real-format key is redacted and a 15-character run is not", () => {
    const key = "sk-or-v1-abcdef0123456789ZYXWVUTSRQPONMLK";

    const sixteen = sanitizeProviderMessage(`bad ${key.slice(5, 21)} credential`, key)!;
    const fifteen = sanitizeProviderMessage(`bad ${key.slice(5, 20)} credential`, key)!;

    expect(sixteen).toBe("bad [redacted] credential");
    expect(fifteen).toBe(`bad ${key.slice(5, 20)} credential`);
  });

  it("does not turn ordinary words into [redacted] because a valid key happens to contain them", () => {
    const key = "overload-0123456789abcd";

    expect(sanitizeProviderMessage("The model is overloaded; retry later", key)).toBe("The model is overloaded; retry later");
    expect(sanitizeProviderMessage("overload overloaded overloading", key)).toBe("overload overloaded overloading");
  });

  it("redacts an upper-cased partial echo that follows unrelated Unicode, without shifting any position", () => {
    const key = "sk-or-v1-abcdef0123456789ZYXWVUTSRQPONMLK";
    const echo = key.slice(9, 31).toUpperCase();

    // Letters such as İ and ß change length when case-folded; the text is never lowercased, so they cannot move the match.
    const text = sanitizeProviderMessage(`İİßß Fehler: ${echo} ist ungültig İ`, key)!;

    expect(text).toBe("İİßß Fehler: [redacted] ist ungültig İ");
  });

  it("a short run of the key (below 16) is left alone", () => {
    const key = "sk-or-v1-abcdef0123456789ZYXWVUTSRQPONMLK";

    expect(sanitizeProviderMessage(`Rate limit for ${key.slice(0, 7)} reached`, key)).toBe("Rate limit for sk-or-v reached");
    expect(sanitizeProviderMessage("The model is overloaded, try again later.", key)).toBe("The model is overloaded, try again later.");
  });

  it("still strips key-shaped tokens and bearer headers that are not this key", () => {
    const text = sanitizeProviderMessage("x sk-or-v1-OTHERKEYOTHERKEY123 y AIzaSyABCDEFGHIJKLMNOPQRSTUVWX z Bearer abc.def", "some-other-key-0123456789")!;

    expect(text).toBe("x [redacted] y [redacted] z Bearer [redacted]");
  });

  it("returns null for an empty or non-string message and trims long ones to 200 characters", () => {
    expect(sanitizeProviderMessage(undefined, "k".repeat(20))).toBeNull();
    expect(sanitizeProviderMessage("   ", "k".repeat(20))).toBeNull();
    expect(sanitizeProviderMessage("a".repeat(500), "k".repeat(20))!.length).toBe(200);
  });
});

describe("runApiKeyTest: values that cannot be sent", () => {
  it("does not call out with a stored key that is not a plausible key (such as an old masked placeholder), and says so", async () => {
    const { result, fetchImpl } = await run({ apiKey: "••••1234" });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, kind: "invalid_key" });
    expect(result.message).toContain("masked");
  });

  it("does not call out with a model that does not fit its provider (it could alter the URL)", async () => {
    const { result, fetchImpl } = await run({ provider: "gemini", apiKey: GEMINI_KEY, model: "../v1/models/x?key=1" });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toMatchObject({ ok: false, kind: "bad_request" });
  });
});
