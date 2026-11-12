import { beforeEach, describe, expect, it } from "vitest";
import { API_KEY_TEST_LIMIT, API_KEY_TEST_WINDOW_MS, checkApiKeyTestRate, resetApiKeyTestRate } from "./api-key-test-rate-limit";

beforeEach(() => resetApiKeyTestRate());

describe("checkApiKeyTestRate", () => {
  it("allows 10 in a minute and refuses the 11th, saying how long to wait", () => {
    const start = 1_000_000;
    for (let i = 0; i < API_KEY_TEST_LIMIT; i += 1) expect(checkApiKeyTestRate("admin", start + i * 1000)).toEqual({ allowed: true });

    const blocked = checkApiKeyTestRate("admin", start + 10_000);

    expect(blocked.allowed).toBe(false);
    // The oldest attempt leaves the window 60s after it was made.
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it("lets calls through again as old ones leave the window", () => {
    const start = 5_000_000;
    for (let i = 0; i < API_KEY_TEST_LIMIT; i += 1) checkApiKeyTestRate("admin", start);

    expect(checkApiKeyTestRate("admin", start + API_KEY_TEST_WINDOW_MS - 1).allowed).toBe(false);
    expect(checkApiKeyTestRate("admin", start + API_KEY_TEST_WINDOW_MS).allowed).toBe(true);
  });

  it("does not count refused attempts against the window", () => {
    const start = 9_000_000;
    for (let i = 0; i < API_KEY_TEST_LIMIT; i += 1) checkApiKeyTestRate("admin", start);
    for (let i = 0; i < 50; i += 1) checkApiKeyTestRate("admin", start + 1000);

    expect(checkApiKeyTestRate("admin", start + API_KEY_TEST_WINDOW_MS).allowed).toBe(true);
  });

  it("keeps a separate window per admin", () => {
    for (let i = 0; i < API_KEY_TEST_LIMIT; i += 1) checkApiKeyTestRate("a", 1);

    expect(checkApiKeyTestRate("a", 2).allowed).toBe(false);
    expect(checkApiKeyTestRate("b", 2).allowed).toBe(true);
  });
});
