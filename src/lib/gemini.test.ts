import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TASK_INSTRUCTIONS } from "@/lib/tcf-tasks";
import {
  GeminiCorrectionParseError,
  GeminiNotConfiguredError,
  GeminiRateLimitedError,
  GeminiRequestError,
  GeminiTransportError,
  generateModelAnswer,
  gradeEssayWithGemini,
} from "./gemini";

const originalFetch = global.fetch;
const originalApiKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
const originalCorrectionModel = process.env.GEMINI_CORRECTION_MODEL;

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_CORRECTION_MODEL;
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalApiKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = originalModel;
  if (originalCorrectionModel === undefined) delete process.env.GEMINI_CORRECTION_MODEL;
  else process.env.GEMINI_CORRECTION_MODEL = originalCorrectionModel;
});

const params = {
  task: TASK_INSTRUCTIONS.TASK_2,
  level: "C1" as const,
  topicPrompt: "Le télétravail est-il bénéfique ?",
};

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  global.fetch = vi.fn().mockResolvedValue(response as Response);
}

describe("generateModelAnswer", () => {
  it("fails closed when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(generateModelAnswer(params)).rejects.toBeInstanceOf(GeminiNotConfiguredError);
  });

  it("returns the generated French text on success", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "  Le télétravail présente des avantages.  " }] } }],
      }),
    });

    await expect(generateModelAnswer(params)).resolves.toBe("Le télétravail présente des avantages.");
  });

  it("uses the default model unless GEMINI_MODEL overrides it", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Réponse." }] } }] }),
    });

    await generateModelAnswer(params);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/models/gemini-3.5-flash:generateContent"),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-goog-api-key": "test-key" }),
        body: expect.stringContaining('"maxOutputTokens":512'),
      }),
    );
    // The key must never be sent in the URL: query strings are far more
    // likely to be logged by an access log or proxy than a header is.
    const [calledUrl] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(calledUrl)).not.toContain("test-key");
  });

  it("throws GeminiRateLimitedError on a 429 response", async () => {
    mockFetchOnce({ ok: false, status: 429, json: async () => ({}) });

    await expect(generateModelAnswer(params)).rejects.toBeInstanceOf(GeminiRateLimitedError);
  });

  it("throws on a non-OK, non-429 response", async () => {
    mockFetchOnce({ ok: false, status: 500, json: async () => ({ error: { message: "boom" } }) });

    await expect(generateModelAnswer(params)).rejects.toThrow(/Gemini request failed \(500\)/);
  });

  it("carries only the HTTP status, never Google's own error message", async () => {
    const sentinelUpstreamMessage = "SENTINEL_UPSTREAM_TEXT_MUST_NOT_LEAK";
    mockFetchOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: sentinelUpstreamMessage } }),
    });

    const error: unknown = await generateModelAnswer(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GeminiRequestError);
    expect((error as GeminiRequestError).status).toBe(400);
    expect((error as GeminiRequestError).message).not.toContain(sentinelUpstreamMessage);
  });

  it("throws GeminiRequestError when the response contains no usable text", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => ({ candidates: [] }) });

    const error: unknown = await generateModelAnswer(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GeminiRequestError);
    expect((error as GeminiRequestError).status).toBe(200);
  });

  it("throws GeminiTransportError, distinct from GeminiRequestError, when fetch itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(generateModelAnswer(params)).rejects.toBeInstanceOf(GeminiTransportError);
  });

  it("throws GeminiRequestError, not GeminiTransportError, when a 200 response body is malformed JSON", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected end of JSON input"); } });

    const error: unknown = await generateModelAnswer(params).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GeminiRequestError);
    expect((error as GeminiRequestError).status).toBe(200);
  });

  it("throws GeminiTransportError, not GeminiRequestError, when the response body stream fails to read after a 200 status", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => { throw new TypeError("terminated"); } });

    await expect(generateModelAnswer(params)).rejects.toBeInstanceOf(GeminiTransportError);
  });

  it("never calls response.json() on a non-OK response", async () => {
    const jsonMock = vi.fn();
    mockFetchOnce({ ok: false, status: 500, json: jsonMock });

    await generateModelAnswer(params).catch(() => {});

    expect(jsonMock).not.toHaveBeenCalled();
  });

  const taskThreeTopicWithDocuments =
    "Faut-il interdire les téléphones portables à l'école ?\n\n" +
    "Document 1 :\nLes téléphones distraient les élèves.\n\n" +
    "Document 2 :\nLes téléphones sont des outils pédagogiques utiles.";

  it("includes the title/summary/opinion structure for a Task 3 topic that has real Document 1/2 sections", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Réponse." }] } }] }),
    });

    await generateModelAnswer({
      ...params,
      task: TASK_INSTRUCTIONS.TASK_3,
      topicPrompt: taskThreeTopicWithDocuments,
    });

    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(String(requestInit.body));
    const promptText = String(body.contents[0].parts[0].text);
    expect(promptText).toContain("Summary (40-60 words)");
    expect(promptText).toContain("argument in favor of your position (two to three sentences)");
    expect(promptText).toContain("a nuance acknowledging a limit or counterpoint");
    expect(promptText).toContain("argument against your position (two to three sentences)");
    expect(promptText).toContain("a brief conclusion restating your personal position");
    expect(promptText).toContain("160-180 words");
    // The title counts toward the same total the validator measures -- the
    // prompt must not claim otherwise.
    expect(promptText).not.toContain("not counted");
  });

  it("omits the Task 3 document-synthesis structure for other tasks", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Réponse." }] } }] }),
    });

    await generateModelAnswer(params);

    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(String(requestInit.body));
    const promptText = String(body.contents[0].parts[0].text);
    expect(promptText).not.toContain("Summary (40-60 words)");
  });

  it("omits the Task 3 document-synthesis structure for a custom topic without real source documents, so the model isn't pushed to invent viewpoints", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: "Réponse." }] } }] }),
    });

    await generateModelAnswer({
      ...params,
      task: TASK_INSTRUCTIONS.TASK_3,
      topicPrompt: "Le télétravail devrait-il être généralisé ?",
    });

    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(String(requestInit.body));
    const promptText = String(body.contents[0].parts[0].text);
    expect(promptText).not.toContain("Summary (40-60 words)");
  });
});

describe("gradeEssayWithGemini", () => {
  const correctionParams = {
    systemPrompt: "You are an examiner grading TCF essays.",
    userPrompt: "Student's essay (12 words):\nBonjour, je m'appelle Marie.",
  };

  const feedback = {
    correctedText: "Bonjour, je m'appelle Marie.",
    modelVersion: "Bonjour, je m'appelle Marie, ravie de vous rencontrer.",
    scores: {
      content: { score: 60, feedback: "Answers the prompt." },
      linguistics: { score: 70, feedback: "Mostly accurate." },
      vocabulary: { score: 65, feedback: "Simple but appropriate." },
    },
    cefrLevel: "B1",
    meetsWordCount: false,
    wordCountNote: "Below the target range.",
    errors: [],
    suggestions: ["Add a supporting detail."],
    summary: "A clear start.",
  };

  it("fails closed when GEMINI_API_KEY is not set", async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(gradeEssayWithGemini(correctionParams)).rejects.toBeInstanceOf(GeminiNotConfiguredError);
  });

  it("returns the parsed JSON feedback on success", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(feedback) }] } }],
      }),
    });

    await expect(gradeEssayWithGemini(correctionParams)).resolves.toEqual(feedback);
  });

  it("sends the system prompt, user prompt, and a JSON response schema", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(feedback) }] } }],
      }),
    });

    await gradeEssayWithGemini(correctionParams);

    const [calledUrl, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(calledUrl)).toContain("/models/gemini-3.5-flash-lite:generateContent");
    const body = JSON.parse(String(requestInit.body));
    expect(body.systemInstruction.parts[0].text).toBe(correctionParams.systemPrompt);
    expect(body.contents[0].parts[0].text).toBe(correctionParams.userPrompt);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.responseSchema.properties.scores.properties.linguistics.properties.score.type).toBe(
      "INTEGER",
    );
    expect(body.generationConfig.responseSchema.properties.scores.properties.linguistics.properties.score).toMatchObject({
      minimum: 0,
      maximum: 100,
    });
    // originalStart/correctionStart are nullable, not just non-required:
    // Gemini fills every declared property either way, so a schema that
    // only marks them non-required would still have Gemini return `null`
    // for an unlocatable offset -- which the schema must explicitly allow.
    const errorItemSchema = body.generationConfig.responseSchema.properties.errors.items;
    expect(errorItemSchema.properties.originalStart).toEqual({ type: "INTEGER", minimum: 0, nullable: true });
    expect(errorItemSchema.properties.correctionStart).toEqual({ type: "INTEGER", minimum: 0, nullable: true });
  });

  it("never sends a temperature parameter, since Google documents it as deprecated for Flash-Lite models", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(feedback) }] } }],
      }),
    });

    await gradeEssayWithGemini(correctionParams);

    const [, requestInit] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(String(requestInit.body));
    expect(body.generationConfig).not.toHaveProperty("temperature");
  });

  it("uses GEMINI_CORRECTION_MODEL when set, independent of GEMINI_MODEL", async () => {
    process.env.GEMINI_MODEL = "gemini-3.5-flash";
    process.env.GEMINI_CORRECTION_MODEL = "gemini-2.5-flash-lite";
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(feedback) }] } }],
      }),
    });

    await gradeEssayWithGemini(correctionParams);

    const [calledUrl] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(calledUrl)).toContain("/models/gemini-2.5-flash-lite:generateContent");
  });

  it("ignores GEMINI_MODEL (the model-answer generator's setting) when choosing the default", async () => {
    process.env.GEMINI_MODEL = "gemini-3.5-flash";
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(feedback) }] } }],
      }),
    });

    await gradeEssayWithGemini(correctionParams);

    const [calledUrl] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(calledUrl)).toContain("/models/gemini-3.5-flash-lite:generateContent");
  });

  it("throws GeminiCorrectionParseError when Gemini's text isn't valid JSON", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "not json" }] } }],
      }),
    });

    await expect(gradeEssayWithGemini(correctionParams)).rejects.toBeInstanceOf(GeminiCorrectionParseError);
  });

  it("throws GeminiRateLimitedError on a 429 response", async () => {
    mockFetchOnce({ ok: false, status: 429, json: async () => ({}) });

    await expect(gradeEssayWithGemini(correctionParams)).rejects.toBeInstanceOf(GeminiRateLimitedError);
  });

  it("throws GeminiTransportError when fetch itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(gradeEssayWithGemini(correctionParams)).rejects.toBeInstanceOf(GeminiTransportError);
  });
});
