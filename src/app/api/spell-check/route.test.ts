import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  getCurrentActivatedAppUserMock,
  AppUserProvisioningErrorMock,
  checkFrenchSpellingMock,
  isSpellCheckRateLimitedMock,
  recordAdminEventMock,
} = vi.hoisted(() => {
  class AppUserProvisioningErrorMock extends Error {}

  return {
    getCurrentActivatedAppUserMock: vi.fn(),
    AppUserProvisioningErrorMock,
    checkFrenchSpellingMock: vi.fn(),
    isSpellCheckRateLimitedMock: vi.fn(),
    recordAdminEventMock: vi.fn(),
  };
});

vi.mock("@/lib/app-user", () => ({ AppUserProvisioningError: AppUserProvisioningErrorMock }));
vi.mock("@/lib/activated-app-user", () => ({ getCurrentActivatedAppUser: getCurrentActivatedAppUserMock }));
vi.mock("@/lib/spell-check", () => ({ checkFrenchSpelling: checkFrenchSpellingMock }));
vi.mock("@/lib/spell-check-rate-limit", () => ({ isSpellCheckRateLimited: isSpellCheckRateLimitedMock }));
vi.mock("@/lib/admin-events", () => ({ recordAdminEvent: recordAdminEventMock }));

const { POST } = await import("./route");
const LOCAL_USER_ID = "cuid_local_user_1";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/spell-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  getCurrentActivatedAppUserMock.mockReset();
  checkFrenchSpellingMock.mockReset();
  isSpellCheckRateLimitedMock.mockReset();
  recordAdminEventMock.mockReset();
  getCurrentActivatedAppUserMock.mockResolvedValue({ id: LOCAL_USER_ID });
  checkFrenchSpellingMock.mockReturnValue([]);
  isSpellCheckRateLimitedMock.mockReturnValue(false);
  recordAdminEventMock.mockResolvedValue(undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("POST /api/spell-check", () => {
  it("rejects unauthenticated and malformed requests", async () => {
    getCurrentActivatedAppUserMock.mockResolvedValueOnce(null);
    expect((await post({ text: "Bonjour" })).status).toBe(401);

    const response = await post({ text: 42 });
    expect(response.status).toBe(400);
    expect(checkFrenchSpellingMock).not.toHaveBeenCalled();
  });

  it("returns 503 while the account is still being provisioned", async () => {
    getCurrentActivatedAppUserMock.mockRejectedValue(new AppUserProvisioningErrorMock("not ready"));
    expect((await post({ text: "Bonjour" })).status).toBe(503);
  });

  it("returns an empty list for blank text without invoking Hunspell", async () => {
    expect(await (await post({ text: "  " })).json()).toEqual({ errors: [] });
    expect(checkFrenchSpellingMock).not.toHaveBeenCalled();
  });

  it("validates long text, rate-limits requests, and returns spelling matches", async () => {
    expect((await post({ text: "a".repeat(20_001) })).status).toBe(400);
    isSpellCheckRateLimitedMock.mockReturnValue(true);
    expect((await post({ text: "Bonjour" })).status).toBe(429);

    isSpellCheckRateLimitedMock.mockReturnValue(false);
    const errors = [{ offset: 8, length: 4, message: "Possible spelling mistake.", replacements: ["très"] }];
    checkFrenchSpellingMock.mockReturnValue(errors);
    expect(await (await post({ text: "Je suis tres content." })).json()).toEqual({ errors });
  });

  it("records a sanitized admin event if the bundled checker fails", async () => {
    checkFrenchSpellingMock.mockImplementation(() => {
      throw new Error("dictionary load failed");
    });

    const response = await post({ text: "Bonjour" });
    expect(response.status).toBe(500);
    expect(recordAdminEventMock).toHaveBeenCalledWith({
      eventType: "SPELL_CHECK_FAILED",
      userId: LOCAL_USER_ID,
      provider: "hunspell",
      reasonCode: "provider_unavailable",
      httpStatus: 500,
    });
  });
});
