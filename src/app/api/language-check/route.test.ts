import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentActivatedAppUserMock, AppUserProvisioningErrorMock, checkFrenchTextMock, isLanguageCheckRateLimitedMock } =
  vi.hoisted(() => {
    class AppUserProvisioningErrorMock extends Error {}

    return {
      getCurrentActivatedAppUserMock: vi.fn(),
      AppUserProvisioningErrorMock,
      checkFrenchTextMock: vi.fn(),
      isLanguageCheckRateLimitedMock: vi.fn(),
    };
  });

vi.mock("@/lib/app-user", () => ({
  AppUserProvisioningError: AppUserProvisioningErrorMock,
}));
vi.mock("@/lib/activated-app-user", () => ({
  getCurrentActivatedAppUser: getCurrentActivatedAppUserMock,
}));
vi.mock("@/lib/language-tool", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/language-tool")>();
  return { ...actual, checkFrenchText: checkFrenchTextMock };
});
vi.mock("@/lib/language-check-rate-limit", () => ({
  isLanguageCheckRateLimited: isLanguageCheckRateLimitedMock,
}));

const { POST } = await import("./route");
const { LanguageToolNotConfiguredError } = await import("@/lib/language-tool");

const LOCAL_USER_ID = "cuid_local_user_1";

function post(body: unknown, signal?: AbortSignal) {
  return POST(
    new Request("http://localhost/api/language-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    }),
  );
}

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  checkFrenchTextMock.mockReset();
  isLanguageCheckRateLimitedMock.mockReset();

  getCurrentActivatedAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
  checkFrenchTextMock.mockResolvedValue([]);
  isLanguageCheckRateLimitedMock.mockReturnValue(false);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/language-check", () => {
  it("rejects unauthenticated requests", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValue(null);

    const response = await post({ text: "Bonjour" });

    expect(response.status).toBe(401);
    expect(checkFrenchTextMock).not.toHaveBeenCalled();
  });

  it("returns 503 while the account is still being provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("not ready"));

    const response = await post({ text: "Bonjour" });

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("ACCOUNT_PROVISIONING_UNAVAILABLE");
  });

  it("rejects a malformed body", async () => {
    const response = await post({ text: 42 });
    expect(response.status).toBe(400);
    expect(checkFrenchTextMock).not.toHaveBeenCalled();
  });

  it("rejects text longer than the editor's own maxLength", async () => {
    const response = await post({ text: "a".repeat(20_001) });
    expect(response.status).toBe(400);
    expect(checkFrenchTextMock).not.toHaveBeenCalled();
  });

  it("returns an empty error list for empty text without calling LanguageTool", async () => {
    const response = await post({ text: "   " });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ errors: [] });
    expect(checkFrenchTextMock).not.toHaveBeenCalled();
  });

  it("returns the mapped matches for valid French text", async () => {
    const matches = [
      {
        offset: 8,
        length: 4,
        message: "Faute de frappe",
        replacements: ["très"],
        category: "TYPOS",
        ruleId: "FR_SPELLING_RULE",
      },
    ];
    checkFrenchTextMock.mockResolvedValue(matches);

    const response = await post({ text: "Je suis tres content." });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ errors: matches });
    expect(checkFrenchTextMock).toHaveBeenCalledWith("Je suis tres content.", expect.anything());
  });

  it("rejects once the per-user rate limit is hit, without calling LanguageTool", async () => {
    isLanguageCheckRateLimitedMock.mockReturnValue(true);

    const response = await post({ text: "Bonjour" });

    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe("LANGUAGE_CHECK_RATE_LIMITED");
    expect(checkFrenchTextMock).not.toHaveBeenCalled();
  });

  it("returns 503 when LanguageTool is not configured", async () => {
    checkFrenchTextMock.mockRejectedValue(new LanguageToolNotConfiguredError());

    const response = await post({ text: "Bonjour" });

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("LANGUAGE_CHECK_UNAVAILABLE");
  });

  it("returns 502 when the LanguageTool request fails", async () => {
    checkFrenchTextMock.mockRejectedValue(new Error("network down"));

    const response = await post({ text: "Bonjour" });

    expect(response.status).toBe(502);
    expect((await response.json()).code).toBe("LANGUAGE_CHECK_UNAVAILABLE");
  });

  it("returns 499 when the client has already cancelled the request", async () => {
    const controller = new AbortController();
    controller.abort();

    const response = await post({ text: "Bonjour" }, controller.signal);

    expect(response.status).toBe(499);
    expect(checkFrenchTextMock).not.toHaveBeenCalled();
  });

  it("handles a long (near max-length) text without special-casing", async () => {
    const longText = "Je suis content. ".repeat(1100); // ~19,800 characters
    checkFrenchTextMock.mockResolvedValue([]);

    const response = await post({ text: longText });

    expect(response.status).toBe(200);
    expect(checkFrenchTextMock).toHaveBeenCalledWith(longText, expect.anything());
  });
});
