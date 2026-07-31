import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRANSLATABLE_MAX_CHARS } from "@/lib/app-locale";

const { authMock, createMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/anthropic", () => ({
  anthropic: { messages: { create: createMock } },
}));

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  authMock.mockReset();
  createMock.mockReset();
  authMock.mockResolvedValue({ user: { id: "user_1" } });
  createMock.mockResolvedValue({
    stop_reason: "end_turn",
    content: [{ type: "text", text: "I enjoy learning French." }],
  });
});

describe("POST /api/translate", () => {
  it("requires an authenticated learner", async () => {
    authMock.mockResolvedValue(null);

    const response = await post({ text: "J'aime apprendre le français.", targetLocale: "en" });

    expect(response.status).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("rejects malformed text or an unsupported target locale", async () => {
    const response = await post({ text: "", targetLocale: "de" });

    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("translates into the requested app language and returns text only", async () => {
    const response = await post({
      text: "J'aime apprendre le français.",
      targetLocale: "pt",
    });

    expect(response.status).toBe(200);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("Portuguese"),
        messages: [{ role: "user", content: "J'aime apprendre le français." }],
      })
    );
    await expect(response.json()).resolves.toEqual({ translation: "I enjoy learning French." });
  });

  it("rejects text longer than the shared translatable-length limit", async () => {
    const response = await post({
      text: "a".repeat(TRANSLATABLE_MAX_CHARS + 1),
      targetLocale: "en",
    });

    expect(response.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns a retryable error when Claude declines the translation", async () => {
    createMock.mockResolvedValue({ stop_reason: "refusal", content: [] });

    const response = await post({ text: "Bonjour.", targetLocale: "es" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "The translation was declined." });
  });

  it("returns a retryable error rather than a partial translation when output is truncated", async () => {
    createMock.mockResolvedValue({
      stop_reason: "max_tokens",
      content: [{ type: "text", text: "Partial translation" }],
    });

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "The translation was too long to complete. Please shorten the draft and try again.",
    });
  });

  it("returns a retryable error when Claude returns no translated text", async () => {
    createMock.mockResolvedValue({ stop_reason: "end_turn", content: [] });

    const response = await post({ text: "Bonjour.", targetLocale: "en" });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "No translation was returned." });
  });
});
